# NeuroMetric: Cognitive Workload Lakehouse

**Analyze 100+ hours of EEG data instantly in your browser.**

NeuroMetric is a Next.js-based "Static Lakehouse" that performs real-time analysis of cognitive workload data. By running an embedded column-store database (**DuckDB-Wasm**) directly in the client, it enables zero-latency SQL queries over millions of EEG data points without backend processing.

It is enhanced by an **Agentic interface** powered by Llama 3 and Groq, capable of writing its own SQL to answer natural language questions (e.g., *"Which subjects showed the highest frontal beta power?"*).

![NeuroMetric Dashboard](https://github.com/0xnomy/neurometric/raw/main/public/dashboard-preview.png)

## 🚀 Key Features

*   **Client-Side Lakehouse**: Full SQL processing in the browser using DuckDB-Wasm. Parquet files are cached locally for sub-millisecond query performance.
*   **Generative UI**: The interface dynamically adapts to data. It generates:
    *   **3D Brain Models**: Interactive glowing cortex visualization for channel-level activity.
    *   **Topographic Maps**: Standard 10-20 heatmap projections using D3.js.
    *   **Dynamic Tables**: Sortable, raw data views for granular inspection.
*   **Semantic Search (RAG)**: Integrates a **FAISS vector store** and specific embedding models to conduct semantic search over EEG feature descriptions.
*   **Neuroscience-Aware Agents**: The LLM is prompt-engineered with deep domain knowledge (alpha/beta bands, frontal vs. occipital roles) to interpret results in real-time.

## 🛠️ Architecture

The system operates on a unique "Pre-baked" architecture:

### 1. The Bronze/Silver Layer (Python Pipeline)
*   **Ingestion**: Raw EEG CSVs (36 subjects, 19 channels) from the [Mental Arithmetic Task Dataset](https://physionet.org/content/eegmat/1.0.0/).
*   **Processing**:
    *   **Welch's Method**: Extracts Power Spectral Density (PSD) for Delta, Theta, Alpha, Beta, Gamma bands.
    *   **Complexity**: Computes Spectral Entropy and Detrended Fluctuation Analysis (DFA) alpha.
    *   **Embeddings**: Text narratives of features are encoded using `all-MiniLM-L6-v2` and indexed in FAISS for RAG.
*   **Output**: Optimized `.parquet` files.

### 2. The Gold Layer (Next.js Application)
*   **Engine**: DuckDB-Wasm loads the Parquet artifacts into Virtual Memory.
*   **Visualization Stack**:
    *   **@react-three/fiber**: 3D Brain visualization.
    *   **D3.js & d3-tricontour**: Topographic heatmaps.
    *   **Framer Motion**: Smooth UI transitions.
*   **Inference**:
    *   **Planning Agent**: Translates user intent -> SQL.
    *   **Insight Agent**: Translates SQL Result -> Cognitive Insight.

## 📦 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: DuckDB-Wasm
- **AI/LLM**: Llama 3.3 70B via Groq SDK
- **Vector Store**: FAISS (IndexFlatL2)
- **Visualization**: React Three Fiber, D3.js, Lucide React
- **Styling**: Tailwind CSS

## ⚡ Getting Started

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/0xnomy/neurometric.git
    cd neurometric
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    # For data pipeline (optional):
    pip install pandas numpy scipy duckdb sentence-transformers faiss-cpu
    ```

3.  **Configure API Keys**
    Create a `.env.local` file:
    ```env
    GROQ_API_KEY=your_groq_key_here
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```
    Visit `http://localhost:3000`.

## 🧪 Example Queries to Try

*   *"Show me the distribution of alpha power."* (Visualization: Topomap)
*   *"Who are the top 5 subjects with high entropy?"* (Visualization: Table)
*   *"How does frontal beta power in subject s04 compare to occipital alpha?"* (Visualization: Mult-channel)
*   *"Explain the role of the Fz electrode."* (Agentic Chat)

## 📄 Dataset Citation

> Zyma I, Tukaev S, Seleznov I, Kiyono K, Popov A, Chernykh M, Shpenkov O. Electroencephalograms during Mental Arithmetic Task Performance. Data. 2019; 4(1):14. https://doi.org/10.3390/data4010014

## 📜 License

MIT License.
