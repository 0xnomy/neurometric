# NeuroMetric

**A Client-Side Agentic RAG Lakehouse for EEG Data Analysis**

NeuroMetric is a sophisticated web-based platform designed to democratize EEG analysis. By leveraging a "Static Lakehouse" architecture, it transforms complex physiological data into an interactive, zero-latency analytics experience directly in the browser.

## Key Features

*   **Zero-Latency Analysis**: Powered by DuckDB-Wasm, enabling SQL queries on millions of data points purely client-side without server roundtrips.
*   **Agentic RAG**: Integrates Llama 3 70B (via Groq) to convert natural language questions into precise SQL queries for instant statistical insights.
*   **Interactive Visuals**: Features a custom HTML5 Canvas neural network background that reacts to connectivity (synaptic) events.
*   **36-Subject Dataset**: Built-in specialized dataset from the PhysioNet "Mental Arithmetic Task" study (Zyma et al., 2019).
*   **Detailed Methodology**: Transparent documentation of the signal processing pipeline (Welch's PSD, Spectral Entropy, DFA).

## Program Flow

The system operates on a unique "Pre-baked" architecture to ensure high performance on edge devices (browsers).

1.  **Data Ingestion (Bronze Layer)**
    *   The `prep.py` pipeline ingests raw CSV files from 36 subjects (19 channels, 500Hz).
    *   Data is cleaned and downsampled to 250Hz.

2.  **Feature Extraction (Silver Layer)**
    *   **Spectral Analysis**: 2-second sliding windows (50% overlap) are processed using Welch's Method.
    *   **Feature Vectors**: Power is extracted for Delta, Theta, Alpha, Beta, and Gamma bands.
    *   **Complexity Metrics**: Spectral Entropy and Detrended Fluctuation Analysis (DFA) are computed.

3.  **Analytics Marts (Gold Layer)**
    *   Data is aggregated into optimized Parquet files (`eeg_features.parquet`, `eeg_subjects.parquet`).
    *   These files are static assets served via a CDN.

4.  **Client-Side Execution**
    *   **Browser**: The Next.js application boots and initializes DuckDB-Wasm.
    *   **Hydration**: The Gold Layer Parquet files are fetched and loaded into the in-memory DuckDB instance.
    *   **Inference**: User questions are sent to the Groq API (Llama 3), which returns SQL queries.
    *   **Result**: DuckDB executes the SQL locally, and results are visualized instantly.

## Getting Started

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/0xnomy/neurometric.git
    cd neurometric
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    # AND
    pip install pandas numpy scipy polars duckdb sentence-transformers faiss-cpu
    ```

3.  **Run the Data Pipeline** (Optional if Parquet files exist)
    ```bash
    python prep.py
    ```

4.  **Start the Development Server**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) with your browser.

## Environment Variables

Create a `.env.local` file in the root directory:

```env
GROQ_API_KEY=your_groq_api_key_here
```

Get your Groq API key from [https://console.groq.com/keys](https://console.groq.com/keys)

## Dataset Citation

> Zyma I, Tukaev S, Seleznov I, Kiyono K, Popov A, Chernykh M, Shpenkov O. Electroencephalograms during Mental Arithmetic Task Performance. Data. 2019; 4(1):14. https://doi.org/10.3390/data4010014

## License

Distributed under the MIT License. See `LICENSE` for more information.
