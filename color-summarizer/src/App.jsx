import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:8000/summarize"; // dev
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB
const PALETTE_SIZES = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const formatFileSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export default function App() {
  const [file, setFile] = useState(null);
  const [k, setK] = useState(6);
  const [maxSide, setMaxSide] = useState(512);
  const [loading, setLoading] = useState(false);
  const [palette, setPalette] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = (nextFile) => {
    if (nextFile && nextFile.size > MAX_FILE_SIZE) {
      alert("Please choose an image under 15 MB.");
      return;
    }
    setFile(nextFile || null);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const droppedFile = event.dataTransfer?.files?.[0];
    if (droppedFile) {
      handleFileChange(droppedFile);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleSummarize = async () => {
    if (!file) {
      alert("Please select an image first.");
      return;
    }

    const safeK = Math.min(12, Math.max(3, Number(k) || 6));
    const safeMaxSide = Math.min(2048, Math.max(128, Number(maxSide) || 512));

    const form = new FormData();
    form.append("file", file);
    form.append("k", String(safeK));
    form.append("max_side", String(safeMaxSide));

    setLoading(true);
    try {
      const res = await fetch(API_URL, { method: "POST", body: form });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      const data = await res.json();
      setPalette(data.palette || []);
    } catch (error) {
      console.error(error);
      alert("We hit a problem while talking to the API. Please try again. " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    handleSummarize();
  };

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(palette, null, 2)], { type: "application/json" });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = "palette.json";
    anchor.click();
  };

  const downloadCSS = () => {
    const vars = [":root {", ...palette.map((color, index) => `  --color-${index + 1}: ${color.hex};`), "}", ""].join("\n");
    const blob = new Blob([vars], { type: "text/css" });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = "palette.css";
    anchor.click();
  };

  const hasPalette = palette.length > 0;

  return (
    <div className="app">
      <main className="layout">
        <section className="panel panel--input">
          <h1 className="panel__title">Artwork setup</h1>
          <p className="panel__description">
            Drag in a file or browse from your device. PNG and JPEG files up to 15 MB are supported.
          </p>

          <form className="form" onSubmit={handleSubmit}>
            <div className="field">
              <span className="field__label">Image source</span>
              <label
                htmlFor="file-input"
                className={`dropzone${isDragging ? " dropzone--active" : ""}${file ? " dropzone--has-file" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  id="file-input"
                  ref={fileInputRef}
                  className="dropzone__input"
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleFileChange(event.target.files?.[0] || null)}
                />

                {file && previewUrl ? (
                  <div className="dropzone__preview">
                    <img src={previewUrl} alt="Selected preview" className="dropzone__image" />
                    <div className="dropzone__details">
                      <span className="dropzone__filename" title={file.name}>
                        {file.name}
                      </span>
                      <span className="dropzone__meta">{formatFileSize(file.size)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="dropzone__placeholder">
                    <strong>Drop your image here</strong>
                    <span>or click to browse</span>
                    <small>PNG or JPEG - under 15 MB</small>
                  </div>
                )}
              </label>
            </div>

            <div className="field">
              <span className="field__label">Palette settings</span>
              <div className="field__grid">
                <label className="control">
                  <span className="control__label">Colors</span>
                  <select
                    className="control__input"
                    value={k}
                    onChange={(event) => setK(Number(event.target.value))}
                  >
                    {PALETTE_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="control">
                  <span className="control__label">Max side (px)</span>
                  <input
                    className="control__input"
                    type="number"
                    min="128"
                    max="2048"
                    step="64"
                    value={maxSide}
                    onChange={(event) => setMaxSide(Number(event.target.value))}
                  />
                </label>
              </div>
            </div>

            <div className="form__actions">
              <button className="btn btn--primary" type="submit" disabled={loading}>
                {loading ? "Analyzing..." : "Generate palette"}
              </button>
              <button className="btn btn--secondary" type="button" onClick={downloadJSON} disabled={!hasPalette}>
                Export JSON
              </button>
              <button className="btn btn--secondary" type="button" onClick={downloadCSS} disabled={!hasPalette}>
                Export CSS vars
              </button>
            </div>
          </form>
        </section>

        <section className="panel panel--output">
          <div className="panel__heading">
            <h2>Palette preview</h2>
            {hasPalette && <span className="panel__badge">{palette.length} colors</span>}
          </div>

          {hasPalette ? (
            <>
              <div className="palette-grid">
                {palette.map((color, index) => (
                  <article className="color-card" key={`${color.hex}-${index}`}>
                    <div className="color-card__swatch" style={{ backgroundColor: color.hex }} />
                    <div className="color-card__body">
                      <button
                        type="button"
                        className="color-card__hex"
                        onClick={() => navigator.clipboard?.writeText(color.hex)}
                        title="Copy HEX to clipboard"
                      >
                        {color.hex}
                      </button>
                      <span className="color-card__meta">RGB {color.rgb.join(", ")}</span>
                      <span className="color-card__percent">{Number(color.percent || 0).toFixed(2)}%</span>
                    </div>
                  </article>
                ))}
              </div>

              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">HEX</th>
                      <th scope="col">RGB</th>
                      <th scope="col">Usage %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {palette.map((color, index) => (
                      <tr key={`${color.hex}-${index}-row`}>
                        <td>{index + 1}</td>
                        <td>{color.hex}</td>
                        <td>{color.rgb.join(", ")}</td>
                        <td>{Number(color.percent || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h3>Waiting for your image</h3>
              <p>
                Once you upload an image we will surface the dominant colors, usage percentages, and export-ready assets
                right here.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
