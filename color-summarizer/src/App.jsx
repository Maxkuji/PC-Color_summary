import { useMemo, useRef, useState } from "react";

const API_URL = "http://localhost:8000/summarize"; // เปลี่ยนได้ตามจริง


export default function App() {
  const [file, setFile] = useState(null);
  const [k, setK] = useState(6);
  const [maxSide, setMaxSide] = useState(512);
  const [loading, setLoading] = useState(false);
  const [palette, setPalette] = useState([]);
  const imgRef = useRef(null);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);

  const onSummarize = async () => {
    if (!file) return alert("เลือกภาพก่อนนะ bro");

    const form = new FormData();
    form.append("file", file);
    form.append("k", String(k));
    form.append("max_side", String(maxSide));

    setLoading(true);
    try {
      const res = await fetch(API_URL, { method: "POST", body: form });
      const data = await res.json();
      setPalette(data.palette || []);
    } catch (e) {
      console.error(e);
      alert("เรียก API ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(palette, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "palette.json";
    a.click();
  };

  const downloadCSS = () => {
    const vars = ":root{\n" + palette.map((c,i)=>`  --color-${i+1}: ${c.hex};`).join("\n") + "\n}";
    const blob = new Blob([vars], { type: "text/css" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "palette.css";
    a.click();
  };

  return (
    <div style={{maxWidth: 1000, margin: "24px auto", fontFamily: "system-ui"}}>
      <h1>🎨 Image Color Summarizer (React + FastAPI)</h1>

      <div style={{display:"flex", gap:16, flexWrap:"wrap", alignItems:"flex-start"}}>
        <div style={{flex:"1 1 320px"}}>
          <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} />
          <div style={{marginTop:8, display:"flex", gap:8, alignItems:"center"}}>
            <label>จำนวนสี:
              <input type="number" min="3" max="12" value={k} onChange={e=>setK(Number(e.target.value)||6)} style={{width:64, marginLeft:6}}/>
            </label>
            <label>ย่อด้านยาว(px):
              <input type="number" min="128" max="2048" step="64" value={maxSide} onChange={e=>setMaxSide(Number(e.target.value)||512)} style={{width:80, marginLeft:6}}/>
            </label>
            <button onClick={onSummarize} disabled={loading} style={{padding:"8px 12px"}}>
              {loading ? "กำลังคำนวณ..." : "Summarize"}
            </button>
            <button onClick={downloadJSON} disabled={!palette.length}>⬇ JSON</button>
            <button onClick={downloadCSS} disabled={!palette.length}>⬇ CSS</button>
          </div>

          {previewUrl && (
            <img ref={imgRef} src={previewUrl} alt="preview" style={{marginTop:12, maxWidth:"100%", border:"1px solid #eee", borderRadius:12}}/>
          )}
        </div>

        <div style={{flex:"1 1 320px"}}>
          <h3>พาเลตสี</h3>
          <div style={{display:"flex", gap:12, flexWrap:"wrap"}}>
            {palette.map((c,i)=>(
              <div key={i} style={{width:160, border:"1px solid #eee", borderRadius:12, overflow:"hidden"}}>
                <div style={{height:70, background:c.hex}} />
                <div style={{padding:10, fontSize:13}}>
                  <div><b>{c.hex}</b></div>
                  <div>RGB: {c.rgb.join(", ")}</div>
                  <div>{c.percent}%</div>
                </div>
              </div>
            ))}
          </div>

          {!!palette.length && (
            <>
              <h3>ตาราง</h3>
              <table style={{width:"100%", borderCollapse:"collapse"}}>
                <thead>
                  <tr><th style={{textAlign:"left"}}>#</th><th style={{textAlign:"left"}}>HEX</th><th style={{textAlign:"left"}}>RGB</th><th style={{textAlign:"left"}}>%</th></tr>
                </thead>
                <tbody>
                  {palette.map((c,i)=>(
                    <tr key={i}>
                      <td>{i+1}</td><td>{c.hex}</td><td>{c.rgb.join(", ")}</td><td>{c.percent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
