#!/usr/bin/env python3
"""
EEG Cognitive Workload Data Pipeline
Bronze/Silver/Gold Lakehouse + FAISS Embeddings
Generates: eeg_features.parquet, eeg_subjects.parquet, eeg_vectors.faiss
"""

import os
import sys
from pathlib import Path
from typing import List, Dict, Tuple
import numpy as np
import pandas as pd
import polars as pl
import duckdb
from scipy import stats, signal
from scipy.stats import skew, kurtosis
from sentence_transformers import SentenceTransformer
import faiss

# ============================================================================
# CONFIG
# ============================================================================
DATASET_DIR = Path("dataset")
PUBLIC_DIR = Path("public")
PUBLIC_DIR.mkdir(exist_ok=True)

# 19 EEG channels (International 10/20 montage)
EEG_CHANNELS = [
    'Fp1', 'Fp2', 'F3', 'F4', 'F7', 'F8', 
    'T3', 'T4', 'C3', 'C4', 'T5', 'T6', 
    'P3', 'P4', 'O1', 'O2', 'Fz', 'Cz', 'Pz'
]

# EEG frequency bands (Hz)
BANDS = {
    'delta': (0.5, 4),
    'theta': (4, 8),
    'alpha': (8, 13),
    'beta': (13, 30),
    'gamma': (30, 50)
}

SAMPLING_RATE = 250  # Hz (assumed standard)
WINDOW_SIZE = 2.0  # seconds
WINDOW_OVERLAP = 0.5  # 50% overlap

print("🧠 EEG Cognitive Workload Pipeline Starting...")
print(f"Expected channels: {len(EEG_CHANNELS)}")
print(f"Window: {WINDOW_SIZE}s with {WINDOW_OVERLAP*100}% overlap")

# ============================================================================
# BRONZE LAYER: Raw EEG Data Ingestion
# ============================================================================

def load_raw_eeg_data(con: duckdb.DuckDBPyConnection) -> None:
    """Load all 36 CSV files into Bronze layer"""
    print("\n[BRONZE] Loading raw EEG data...")
    
    csv_files = sorted(DATASET_DIR.glob("s*.csv"))[:5] # Limit to 5 for portfolio build
    print(f"Found {len(csv_files)} subject files")
    
    if len(csv_files) == 0:
        raise FileNotFoundError(f"No CSV files found in {DATASET_DIR}")
    
    # Load first file to determine structure
    first_df = pd.read_csv(csv_files[0], header=None)
    n_cols = first_df.shape[1]
    
    if n_cols != len(EEG_CHANNELS):
        print(f"⚠️  WARNING: CSV has {n_cols} columns but expected {len(EEG_CHANNELS)}")
        print(f"Using first {min(n_cols, len(EEG_CHANNELS))} channels")
    
    # Create unified raw table
    all_data = []
    
    for csv_path in csv_files:
        subject_id = csv_path.stem  # e.g., 's00'
        df = pd.read_csv(csv_path, header=None)
        
        # Assign channel names
        df.columns = EEG_CHANNELS[:df.shape[1]]
        df['subject'] = subject_id
        df['sample_idx'] = np.arange(len(df))
        df['time_sec'] = df['sample_idx'] / SAMPLING_RATE
        
        all_data.append(df)
        print(f"  ✓ Loaded {subject_id}: {len(df)} samples ({len(df)/SAMPLING_RATE:.1f}s)")
    
    # Combine all subjects
    raw_eeg = pd.concat(all_data, ignore_index=True)
    
    # Register in DuckDB
    con.register('raw_eeg', raw_eeg)
    con.execute("""
        CREATE OR REPLACE TABLE bronze_eeg AS 
        SELECT * FROM raw_eeg
    """)
    
    total_samples = con.execute("SELECT COUNT(*) FROM bronze_eeg").fetchone()[0]
    total_subjects = con.execute("SELECT COUNT(DISTINCT subject) FROM bronze_eeg").fetchone()[0]
    
    print(f"\n✅ Bronze layer: {total_samples:,} samples from {total_subjects} subjects")

# ============================================================================
# SILVER LAYER: Feature Engineering
# ============================================================================

def compute_bandpower(data: np.ndarray, fs: float, band: Tuple[float, float]) -> float:
    """Compute bandpower using Welch's method"""
    freqs, psd = signal.welch(data, fs, nperseg=min(256, len(data)))
    idx_band = np.logical_and(freqs >= band[0], freqs <= band[1])
    return np.trapz(psd[idx_band], freqs[idx_band])

def compute_spectral_entropy(data: np.ndarray, fs: float) -> float:
    """Compute spectral entropy"""
    freqs, psd = signal.welch(data, fs, nperseg=min(256, len(data)))
    psd_norm = psd / psd.sum()
    psd_norm = psd_norm[psd_norm > 0]
    return -np.sum(psd_norm * np.log2(psd_norm))

def compute_dfa(data: np.ndarray) -> float:
    """Detrended Fluctuation Analysis (simplified)"""
    try:
        N = len(data)
        if N < 16:
            return 0.0
        
        # Mean center
        y = np.cumsum(data - np.mean(data))
        
        # Calculate fluctuation
        scales = np.logspace(1, np.log10(N//4), 8).astype(int)
        flucts = []
        
        for scale in scales:
            segments = N // scale
            if segments < 1:
                continue
            
            F = []
            for i in range(segments):
                segment = y[i*scale:(i+1)*scale]
                if len(segment) < 2:
                    continue
                x = np.arange(len(segment))
                fit = np.polyfit(x, segment, 1)
                trend = np.polyval(fit, x)
                F.append(np.sqrt(np.mean((segment - trend)**2)))
            
            if F:
                flucts.append(np.mean(F))
        
        if len(flucts) < 2:
            return 0.0
        
        # Power law: F(n) ~ n^alpha
        log_scales = np.log10(scales[:len(flucts)])
        log_flucts = np.log10(flucts)
        alpha = np.polyfit(log_scales, log_flucts, 1)[0]
        
        return alpha
    except:
        return 0.0

def extract_window_features(window_data: np.ndarray, channel: str, fs: float) -> Dict:
    """Extract all features from a single window"""
    features = {
        'channel': channel,
        'mean_val': float(np.mean(window_data)),
        'var_val': float(np.var(window_data)),
        'min_val': float(np.min(window_data)),
        'max_val': float(np.max(window_data)),
        'skewness': float(skew(window_data)),
        'kurtosis': float(kurtosis(window_data)),
        'energy': float(np.sum(window_data ** 2)),
    }
    
    # Bandpower for each frequency band
    for band_name, band_range in BANDS.items():
        features[f'{band_name}_power'] = float(compute_bandpower(window_data, fs, band_range))
    
    # Spectral entropy
    features['spectral_entropy'] = float(compute_spectral_entropy(window_data, fs))
    
    # DFA alpha
    features['dfa_alpha'] = float(compute_dfa(window_data))
    
    return features

def create_silver_features(con: duckdb.DuckDBPyConnection) -> pd.DataFrame:
    """Window EEG data and extract features"""
    print("\n[SILVER] Extracting windowed features...")
    
    # Get raw data
    raw_df = con.execute("SELECT * FROM bronze_eeg").fetch_df()
    
    subjects = raw_df['subject'].unique()
    window_samples = int(WINDOW_SIZE * SAMPLING_RATE)
    step_samples = int(window_samples * (1 - WINDOW_OVERLAP))
    
    all_features = []
    
    for subject in subjects:
        subject_data = raw_df[raw_df['subject'] == subject]
        n_samples = len(subject_data)
        
        print(f"  Processing {subject} ({n_samples} samples)...")
        
        # Slide windows
        window_count = 0
        for start_idx in range(0, n_samples - window_samples + 1, step_samples):
            end_idx = start_idx + window_samples
            window_slice = subject_data.iloc[start_idx:end_idx]
            
            window_start = window_slice['time_sec'].iloc[0]
            window_end = window_slice['time_sec'].iloc[-1]
            
            # Extract features for each channel
            for channel in EEG_CHANNELS:
                if channel not in window_slice.columns:
                    continue
                    
                channel_data = window_slice[channel].values
                
                if len(channel_data) < 10:
                    continue
                
                features = extract_window_features(channel_data, channel, SAMPLING_RATE)
                features['subject'] = subject
                features['window_idx'] = window_count
                features['window_start'] = window_start
                features['window_end'] = window_end
                
                all_features.append(features)
            
            window_count += 1
        
        print(f"    ✓ {window_count} windows extracted")
    
    features_df = pd.DataFrame(all_features)
    
    # Register in DuckDB
    con.register('silver_features', features_df)
    con.execute("""
        CREATE OR REPLACE TABLE silver_eeg_features AS 
        SELECT * FROM silver_features
    """)
    
    print(f"\n✅ Silver layer: {len(features_df):,} feature vectors")
    
    return features_df

# ============================================================================
# GOLD LAYER: Analytics Marts
# ============================================================================

def create_gold_layer(con: duckdb.DuckDBPyConnection) -> None:
    """Create analytics marts for agent queries"""
    print("\n[GOLD] Creating analytics marts...")
    
    # Workload statistics by channel
    con.execute("""
        CREATE OR REPLACE TABLE gold_workload_stats AS
        SELECT
            channel,
            AVG(mean_val) AS avg_mean,
            AVG(var_val) AS avg_variance,
            AVG(alpha_power) AS avg_alpha,
            AVG(beta_power) AS avg_beta,
            AVG(theta_power) AS avg_theta,
            AVG(delta_power) AS avg_delta,
            AVG(gamma_power) AS avg_gamma,
            AVG(spectral_entropy) AS avg_spectral_entropy,
            AVG(dfa_alpha) AS avg_dfa,
            STDDEV(alpha_power) AS std_alpha,
            STDDEV(beta_power) AS std_beta,
            COUNT(*) as n_windows
        FROM silver_eeg_features
        GROUP BY channel
        ORDER BY avg_beta DESC
    """)
    
    # Subject-level statistics
    con.execute("""
        CREATE OR REPLACE TABLE gold_subject_stats AS
        SELECT
            subject,
            COUNT(DISTINCT window_idx) AS n_windows,
            AVG(alpha_power) AS avg_alpha,
            AVG(beta_power) AS avg_beta,
            AVG(theta_power) AS avg_theta,
            AVG(dfa_alpha) AS avg_dfa,
            AVG(spectral_entropy) AS avg_entropy
        FROM silver_eeg_features
        GROUP BY subject
        ORDER BY subject
    """)
    
    print("  ✓ gold_workload_stats created")
    print("  ✓ gold_subject_stats created")
    
    # Export to parquet
    print("\n  Exporting to parquet...")
    
    con.execute(f"COPY silver_eeg_features TO '{PUBLIC_DIR}/eeg_features.parquet' (FORMAT PARQUET)")
    size_mb = (PUBLIC_DIR / 'eeg_features.parquet').stat().st_size / 1e6
    print(f"    ✓ eeg_features.parquet ({size_mb:.2f}MB)")
    
    con.execute(f"COPY gold_subject_stats TO '{PUBLIC_DIR}/eeg_subjects.parquet' (FORMAT PARQUET)")
    size_mb = (PUBLIC_DIR / 'eeg_subjects.parquet').stat().st_size / 1e6
    print(f"    ✓ eeg_subjects.parquet ({size_mb:.2f}MB)")
    
    print(f"\n✅ Gold layer complete")

# ============================================================================
# EMBEDDINGS: Semantic RAG
# ============================================================================

def create_embeddings(con: duckdb.DuckDBPyConnection) -> None:
    """Generate FAISS embeddings for semantic search"""
    print("\n[EMBEDDINGS] Creating FAISS index...")
    
    # Sample features for embedding (to keep size manageable)
    df = con.execute("""
        SELECT 
            subject, channel, window_idx, window_start,
            alpha_power, beta_power, theta_power, 
            dfa_alpha, spectral_entropy, mean_val
        FROM silver_eeg_features
        LIMIT 10000
    """).fetch_df()
    
    if len(df) == 0:
        print("  ! No data to embed")
        return
    
    # Create descriptive narratives
    narratives = []
    for _, row in df.iterrows():
        narrative = (
            f"Subject {row['subject']} channel {row['channel']} "
            f"alpha {row['alpha_power']:.2e} beta {row['beta_power']:.2e} "
            f"theta {row['theta_power']:.2e} DFA {row['dfa_alpha']:.3f} "
            f"entropy {row['spectral_entropy']:.2f}"
        )
        narratives.append(narrative)
    
    print(f"  Encoding {len(narratives)} windows...")
    
    # Load embedding model
    model = SentenceTransformer('all-MiniLM-L6-v2')
    embeddings = model.encode(narratives, show_progress_bar=True, batch_size=32)
    embeddings = np.array(embeddings, dtype=np.float32)
    
    print(f"  Embeddings shape: {embeddings.shape}")
    
    # Build FAISS index
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings)
    
    # Save index
    faiss_path = PUBLIC_DIR / "eeg_vectors.faiss"
    faiss.write_index(index, str(faiss_path))
    size_mb = faiss_path.stat().st_size / 1e6
    print(f"  ✓ eeg_vectors.faiss ({size_mb:.2f}MB)")
    
    print(f"\n✅ Embeddings complete: {len(embeddings)} vectors indexed")

# ============================================================================
# CHANNEL METADATA
# ============================================================================

def create_channel_metadata() -> None:
    """Generate channel metadata JSON"""
    import json
    
    metadata = {
        "channels": EEG_CHANNELS,
        "sampling_rate": SAMPLING_RATE,
        "window_size_sec": WINDOW_SIZE,
        "overlap": WINDOW_OVERLAP,
        "montage": "International 10/20",
        "reference": "Linked-ear",
        "filters": {
            "highpass": "30 Hz",
            "notch": "50 Hz"
        },
        "bands": {
            "delta": list(BANDS['delta']),
            "theta": list(BANDS['theta']),
            "alpha": list(BANDS['alpha']),
            "beta": list(BANDS['beta']),
            "gamma": list(BANDS['gamma'])
        },
        "channel_locations": {
            "frontal": ["Fp1", "Fp2", "F3", "F4", "F7", "F8", "Fz"],
            "central": ["C3", "C4", "Cz"],
            "temporal": ["T3", "T4", "T5", "T6"],
            "parietal": ["P3", "P4", "Pz"],
            "occipital": ["O1", "O2"]
        }
    }
    
    metadata_path = PUBLIC_DIR / "channel_metadata.json"
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"✅ channel_metadata.json created")

# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    print("=" * 70)
    print("🧠 EEG COGNITIVE WORKLOAD LAKEHOUSE PIPELINE")
    print("=" * 70)
    
    # Initialize DuckDB
    con = duckdb.connect(':memory:')
    
    try:
        # BRONZE: Load raw EEG
        load_raw_eeg_data(con)
        
        # SILVER: Extract features
        create_silver_features(con)
        
        # GOLD: Create analytics marts
        create_gold_layer(con)
        
        # EMBEDDINGS: Create FAISS index
        # print("Skipping embeddings for faster build...")
        # create_embeddings(con)
        
        # METADATA: Channel info
        create_channel_metadata()
        
        print("\n" + "=" * 70)
        print("✅ PIPELINE COMPLETE")
        print("=" * 70)
        
        # Summary
        print("\n📦 Output files:")
        total_size = 0
        for file in sorted(PUBLIC_DIR.glob("*")):
            size_mb = file.stat().st_size / 1e6
            total_size += size_mb
            print(f"  {file.name:35s} {size_mb:8.2f} MB")
        
        print(f"\n  {'TOTAL':35s} {total_size:8.2f} MB")
        
        if total_size > 45:
            print("\n⚠️  WARNING: Total exceeds 45MB Vercel limit!")
            print("   Consider reducing sample size or window count")
        else:
            print(f"\n✅ Size OK for Vercel deployment ({total_size:.1f}/45 MB)")
        
    except Exception as e:
        print(f"\n❌ Pipeline failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    finally:
        con.close()

if __name__ == "__main__":
    main()
