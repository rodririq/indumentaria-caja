import { useState, useCallback, useEffect } from "react";

// ── Persistencia localStorage ──
const STORAGE_KEY = "indumentaria_caja_v1";
const STORAGE_CAT_KEY = "indumentaria_categorias_v1";

const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const saveToStorage = (dias) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(dias)); } catch {}
};

const loadCategorias = () => {
  try {
    const raw = localStorage.getItem(STORAGE_CAT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const saveCategorias = (cats) => {
  try { localStorage.setItem(STORAGE_CAT_KEY, JSON.stringify(cats)); } catch {}
};

const LOCALES = ["TAMARISCO", "KUBIKO", "NARROW", "TAMA NQN"];
const ACCENT_COLORS = ["#c0392b", "#2471a3", "#d4a017", "#1e8449"];
const CAT_COLORS = ["#7c3aed","#059669","#dc2626","#2563eb","#d97706","#db2777","#64748b","#16a34a","#ea580c","#9333ea"];
const CATEGORIAS_DEFAULT = ["Alquiler","Sueldos","Packaging","Servicios","Flete","Varios"];

const formatPesos = (val) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(val || 0);

const parseNum = (str) => {
  const cleaned = String(str).replace(/[^\d.,]/g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
};

const today = () => new Date().toISOString().slice(0, 10);

const DIAS_ES = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const MESES_ES = ["enero","feb","marzo","abr","mayo","jun","jul","ago","sep","oct","nov","dic"];

const formatFechaLarga = (fechaISO) => {
  const [y, m, d] = fechaISO.split("-");
  const fecha = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  return `${DIAS_ES[fecha.getDay()]} ${parseInt(d)} de ${MESES_ES[parseInt(m)-1]} ${y}`;
};

const formatFechaCorta = (fechaISO) => {
  const [y, m, d] = fechaISO.split("-");
  return `${parseInt(d)}/${parseInt(m)}`;
};

const emptyDay = (fecha) => ({
  fecha: fecha || today(),
  locales: Object.fromEntries(LOCALES.map((l) => [l, { efectivo: "", debito: "", credito: "", transferencia: "" }])),
  gastos: [],
});

const calcDia = (dia) => {
  const totalLocal = (local) => {
    const v = dia.locales[local];
    return parseNum(v.efectivo) + parseNum(v.debito) + parseNum(v.credito) + parseNum(v.transferencia);
  };
  const efectivoLocal = (local) => parseNum(dia.locales[local].efectivo);
  const totalVentasEfectivo = LOCALES.reduce((s, l) => s + efectivoLocal(l), 0);
  const totalGastos = dia.gastos.reduce((s, g) => s + parseNum(g.monto), 0);
  const gastosEfectivo = dia.gastos.filter((g) => g.medio === "efectivo").reduce((s, g) => s + parseNum(g.monto), 0);
  const gastosBanco = dia.gastos.filter((g) => g.medio === "banco").reduce((s, g) => s + parseNum(g.monto), 0);
  const totalEfectivoNeto = totalVentasEfectivo - gastosEfectivo;
  const totalVentasGeneral = LOCALES.reduce((s, l) => s + totalLocal(l), 0);
  return { totalLocal, efectivoLocal, totalVentasEfectivo, totalGastos, gastosEfectivo, gastosBanco, totalEfectivoNeto, totalVentasGeneral };
};

const pct = (val, total) => total > 0 ? Math.round((val / total) * 100) : 0;

// ── Paleta clara ──
const C = {
  bg: "#f8f9fb",
  surface: "#ffffff",
  border: "#e2e6ea",
  borderStrong: "#cbd2d9",
  text: "#1a202c",
  textMid: "#4a5568",
  textLight: "#9aa5b1",
  red: "#c0392b",
  blue: "#2471a3",
  green: "#1e8449",
  yellow: "#b7770d",
  purple: "#6d28d9",
  cyan: "#0e7490",
};

export default function App() {
  const [dias, setDias] = useState(() => loadFromStorage() || [emptyDay()]);
  const [diaActivo, setDiaActivo] = useState(0);
  const [tab, setTab] = useState("ventas");
  const [categorias, setCategorias] = useState(() => loadCategorias() || CATEGORIAS_DEFAULT);
  const [nuevaCat, setNuevaCat] = useState("");
  const [gestionCat, setGestionCat] = useState(false);
  const [nuevoGastoDesc, setNuevoGastoDesc] = useState("");
  const [nuevoGastoMonto, setNuevoGastoMonto] = useState("");
  const [nuevoGastoCat, setNuevoGastoCat] = useState(CATEGORIAS_DEFAULT[0]);
  const [nuevoGastoMedio, setNuevoGastoMedio] = useState("efectivo");
  const [historialExpandido, setHistorialExpandido] = useState(null);
  const [filtroCat, setFiltroCat] = useState("TODAS");

  // Guardar automáticamente cuando cambian los datos
  useEffect(() => { saveToStorage(dias); }, [dias]);
  useEffect(() => { saveCategorias(categorias); }, [categorias]);

  const dia = dias[diaActivo] || dias[0];
  const { totalLocal, totalVentasEfectivo, totalGastos, gastosEfectivo, gastosBanco, totalEfectivoNeto, totalVentasGeneral } = calcDia(dia);

  const updateVenta = useCallback((local, campo, valor) => {
    setDias((prev) =>
      prev.map((d, i) =>
        i !== diaActivo ? d : { ...d, locales: { ...d.locales, [local]: { ...d.locales[local], [campo]: valor } } }
      )
    );
  }, [diaActivo]);

  const updateFecha = (idx, nuevaFecha) => {
    setDias((prev) => prev.map((d, i) => (i !== idx ? d : { ...d, fecha: nuevaFecha })));
  };

  const agregarGasto = () => {
    if (!nuevoGastoDesc.trim() || !nuevoGastoMonto) return;
    setDias((prev) =>
      prev.map((d, i) =>
        i !== diaActivo ? d : {
          ...d, gastos: [...d.gastos, { desc: nuevoGastoDesc, monto: nuevoGastoMonto, cat: nuevoGastoCat, medio: nuevoGastoMedio }]
        }
      )
    );
    setNuevoGastoDesc("");
    setNuevoGastoMonto("");
  };

  const eliminarGasto = (idx) => {
    setDias((prev) =>
      prev.map((d, i) => i !== diaActivo ? d : { ...d, gastos: d.gastos.filter((_, gi) => gi !== idx) })
    );
  };

  const agregarDia = () => {
    setDias((prev) => [...prev, emptyDay()]);
    setDiaActivo(dias.length);
    setTab("ventas");
  };

  const eliminarDia = (idx) => {
    if (dias.length === 1) return;
    const newDias = dias.filter((_, i) => i !== idx);
    setDias(newDias);
    setDiaActivo(Math.min(diaActivo, newDias.length - 1));
  };

  const agregarCategoria = () => {
    const nombre = nuevaCat.trim();
    if (!nombre || categorias.includes(nombre)) return;
    setCategorias((prev) => [...prev, nombre]);
    setNuevaCat("");
    setNuevoGastoCat(nombre);
  };

  const eliminarCategoria = (cat) => {
    setCategorias((prev) => prev.filter((c) => c !== cat));
    if (nuevoGastoCat === cat) setNuevoGastoCat(categorias.find((c) => c !== cat) || "");
  };

  const catColor = (cat) => CAT_COLORS[categorias.indexOf(cat) % CAT_COLORS.length] || "#888";

  const gastosFiltrados = filtroCat === "TODAS" ? dia.gastos : dia.gastos.filter((g) => g.cat === filtroCat);
  const totalFiltrado = gastosFiltrados.reduce((s, g) => s + parseNum(g.monto), 0);
  const totalesPorCat = categorias.map((cat) => ({
    cat,
    total: dia.gastos.filter((g) => g.cat === cat).reduce((s, g) => s + parseNum(g.monto), 0),
  })).filter((x) => x.total > 0);

  const inp = {
    background: "#fff", border: `1px solid ${C.border}`, borderRadius: 6,
    color: C.text, padding: "9px 12px", fontSize: 13,
    fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box",
  };

  const TABS = [["ventas","Ventas"],["gastos","Gastos"],["resumen","Resumen"],["historial","Historial"]];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter', 'Segoe UI', sans-serif", color: C.text, display: "flex", flexDirection: "column" }}>

      {/* ═══════════ HEADER ═══════════ */}
      <div style={{ background: "#fff", borderBottom: `1px solid ${C.border}`, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, color: C.red, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>Sistema de Caja</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: "-0.03em" }}>Indumentaria</h1>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={agregarDia} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", background: C.red, border: "none", borderRadius: 8,
            color: "#fff", fontFamily: "inherit", fontWeight: 600, fontSize: 13, cursor: "pointer",
          }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Nuevo día
          </button>
          <button onClick={() => {
            if (window.confirm("¿Borrar todos los datos guardados? Esta acción no se puede deshacer.")) {
              localStorage.removeItem("indumentaria_caja_v1");
              localStorage.removeItem("indumentaria_categorias_v1");
              window.location.reload();
            }
          }} style={{
            padding: "8px 12px", background: "transparent", border: `1px solid ${C.border}`,
            borderRadius: 8, color: C.textLight, fontFamily: "inherit", fontSize: 12, cursor: "pointer",
          }} title="Borrar todos los datos">🗑</button>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>

        {/* ═══════════ PANEL LATERAL DE DÍAS ═══════════ */}
        <div style={{
          width: 200, flexShrink: 0, background: "#fff",
          borderRight: `1px solid ${C.border}`,
          display: "flex", flexDirection: "column",
          position: "sticky", top: 0, alignSelf: "flex-start", maxHeight: "100vh", overflowY: "auto",
        }}>
          <div style={{ padding: "12px 14px 6px", fontSize: 10, fontWeight: 700, color: C.textLight, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Días registrados
          </div>

          {[...dias].map((d, i) => {
            const c = calcDia(d);
            const activo = i === diaActivo;
            return (
              <div
                key={i}
                onClick={() => { setDiaActivo(i); if (tab === "historial") setTab("ventas"); }}
                style={{
                  padding: "10px 14px", cursor: "pointer", borderLeft: activo ? `3px solid ${C.red}` : "3px solid transparent",
                  background: activo ? "#fdf3f2" : "transparent",
                  transition: "all 0.12s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: activo ? 700 : 500, color: activo ? C.red : C.text }}>
                      {formatFechaCorta(d.fecha)}
                    </div>
                    <div style={{ fontSize: 10, color: C.textLight, marginTop: 1 }}>
                      {formatFechaLarga(d.fecha).split(" ")[0]}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.textMid }}>{formatPesos(c.totalVentasGeneral)}</div>
                    <div style={{ fontSize: 10, color: c.totalEfectivoNeto >= 0 ? C.green : C.red, fontWeight: 600 }}>
                      {formatPesos(c.totalEfectivoNeto)}
                    </div>
                  </div>
                </div>
                {/* Editar fecha inline si activo */}
                {activo && (
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="date"
                      value={d.fecha}
                      onChange={(e) => updateFecha(i, e.target.value)}
                      style={{ ...inp, padding: "4px 6px", fontSize: 11, flex: 1, minWidth: 0 }}
                    />
                    {dias.length > 1 && (
                      <button onClick={() => eliminarDia(i)} title="Eliminar día" style={{
                        background: "transparent", border: `1px solid ${C.border}`, color: C.textLight,
                        borderRadius: 4, width: 24, height: 24, cursor: "pointer", fontSize: 14, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>×</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ═══════════ CONTENIDO PRINCIPAL ═══════════ */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>

          {/* Indicador del día activo */}
          <div style={{ background: "#fff", borderBottom: `1px solid ${C.border}`, padding: "10px 20px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.red, flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{formatFechaLarga(dia.fecha)}</span>
            <span style={{ fontSize: 12, color: C.textLight, marginLeft: 4 }}>— día activo</span>
          </div>

          {/* Tabs */}
          <div style={{ background: "#fff", borderBottom: `1px solid ${C.border}`, padding: "0 20px", display: "flex", gap: 0 }}>
            {TABS.map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                padding: "12px 16px", background: "transparent", border: "none",
                borderBottom: tab === id ? `2px solid ${C.red}` : "2px solid transparent",
                color: tab === id ? C.red : C.textMid, cursor: "pointer",
                fontSize: 13, fontFamily: "inherit", fontWeight: tab === id ? 700 : 400,
                transition: "all 0.12s",
              }}>{label}</button>
            ))}
          </div>

          <div style={{ padding: "20px", flex: 1 }}>

            {/* ====== VENTAS ====== */}
            {tab === "ventas" && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
                  {LOCALES.map((local, li) => {
                    const col = ACCENT_COLORS[li];
                    const v = dia.locales[local];
                    const tot = totalLocal(local);
                    const campos = [
                      ["efectivo", "💵 Efectivo"],
                      ["debito", "💳 Débito"],
                      ["credito", "💳 Crédito"],
                      ["transferencia", "📲 Transfer."],
                    ];
                    return (
                      <div key={local} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                        {/* Header local */}
                        <div style={{ background: col, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.1em", color: "#fff" }}>{local}</span>
                          <span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{formatPesos(tot)}</span>
                        </div>

                        {/* Barra de composición */}
                        {tot > 0 && (
                          <div style={{ display: "flex", height: 4 }}>
                            {campos.map(([campo], ci) => {
                              const val = parseNum(v[campo]);
                              const p = pct(val, tot);
                              if (!p) return null;
                              const barColors = ["#27ae60","#2980b9","#8e44ad","#e67e22"];
                              return <div key={campo} style={{ width: `${p}%`, background: barColors[ci], transition: "width 0.3s" }} />;
                            })}
                          </div>
                        )}

                        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                          {campos.map(([campo, label], ci) => {
                            const val = parseNum(v[campo]);
                            const p = pct(val, tot);
                            const tagColors = ["#d4edda","#d1ecf1","#e8d5f5","#ffecd1"];
                            const tagText = ["#1e5c31","#0c4a5e","#5b2d8e","#7d4100"];
                            return (
                              <div key={campo}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                                  <label style={{ fontSize: 12, color: C.textMid, flex: 1 }}>{label}</label>
                                  {val > 0 && (
                                    <span style={{
                                      fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 10,
                                      background: tagColors[ci], color: tagText[ci],
                                    }}>{p}%</span>
                                  )}
                                </div>
                                <div style={{ position: "relative" }}>
                                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.textLight, fontSize: 12 }}>$</span>
                                  <input
                                    type="number"
                                    value={v[campo]}
                                    onChange={(e) => updateVenta(local, campo, e.target.value)}
                                    placeholder="0"
                                    style={{ ...inp, paddingLeft: 24, borderColor: val > 0 ? col : C.border }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Totales */}
                <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                  {[
                    ["Total ventas", totalVentasGeneral, C.text, "#f0f4ff"],
                    ["Efectivo cobrado", totalVentasEfectivo, C.blue, "#e8f4fd"],
                    ["Efectivo neto en caja", totalEfectivoNeto, totalEfectivoNeto >= 0 ? C.green : C.red, totalEfectivoNeto >= 0 ? "#eafaf1" : "#fdf3f2"],
                  ].map(([label, val, color, bg]) => (
                    <div key={label} style={{ background: bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
                      <div style={{ fontSize: 11, color: C.textLight, marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color }}>{formatPesos(val)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ====== GASTOS ====== */}
            {tab === "gastos" && (
              <div>
                {/* Gestión categorías */}
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 14, overflow: "hidden" }}>
                  <div onClick={() => setGestionCat(!gestionCat)} style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.purple }}>🏷 Categorías de egresos</span>
                    <span style={{ fontSize: 12, color: C.textLight }}>{gestionCat ? "▲" : "▼"}</span>
                  </div>
                  {gestionCat && (
                    <div style={{ borderTop: `1px solid ${C.border}`, padding: "14px 16px" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                        {categorias.map((cat) => (
                          <div key={cat} style={{ display: "flex", alignItems: "center", gap: 5, background: `${catColor(cat)}18`, border: `1px solid ${catColor(cat)}55`, borderRadius: 20, padding: "4px 10px 4px 8px" }}>
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: catColor(cat) }} />
                            <span style={{ fontSize: 12, color: catColor(cat), fontWeight: 600 }}>{cat}</span>
                            <button onClick={() => eliminarCategoria(cat)} style={{ background: "transparent", border: "none", color: `${catColor(cat)}99`, cursor: "pointer", fontSize: 14, padding: "0 0 0 2px", lineHeight: 1 }}>×</button>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input type="text" value={nuevaCat} onChange={(e) => setNuevaCat(e.target.value)} onKeyDown={(e) => e.key === "Enter" && agregarCategoria()} placeholder="Nueva categoría..." style={{ ...inp, flex: 1 }} />
                        <button onClick={agregarCategoria} style={{ padding: "9px 16px", background: C.purple, border: "none", borderRadius: 6, color: "#fff", fontFamily: "inherit", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>+ Agregar</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Formulario */}
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Registrar egreso</div>

                  {/* Medio de pago */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.textMid, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Medio de pago</div>
                    <div style={{ display: "flex", gap: 10 }}>
                      {[["efectivo","💵 Efectivo","Se descuenta del efectivo en caja", C.green],["banco","🏦 Banco / Transfer.","No afecta el efectivo en caja", C.cyan]].map(([id, label, hint, color]) => (
                        <button key={id} onClick={() => setNuevoGastoMedio(id)} style={{
                          flex: 1, padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                          fontFamily: "inherit", fontSize: 12, fontWeight: 600, textAlign: "left",
                          background: nuevoGastoMedio === id ? `${color}12` : "#fafafa",
                          border: nuevoGastoMedio === id ? `2px solid ${color}` : `2px solid ${C.border}`,
                          color: nuevoGastoMedio === id ? color : C.textMid,
                          transition: "all 0.12s",
                        }}>
                          <div>{label}</div>
                          <div style={{ fontSize: 10, fontWeight: 400, marginTop: 3, opacity: 0.8 }}>{hint}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Categoría */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.textMid, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Categoría</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {categorias.map((cat) => (
                        <button key={cat} onClick={() => setNuevoGastoCat(cat)} style={{
                          padding: "5px 12px", borderRadius: 20, cursor: "pointer", fontSize: 12, fontFamily: "inherit", fontWeight: 500,
                          background: nuevoGastoCat === cat ? `${catColor(cat)}18` : "#fafafa",
                          border: nuevoGastoCat === cat ? `1.5px solid ${catColor(cat)}` : `1.5px solid ${C.border}`,
                          color: nuevoGastoCat === cat ? catColor(cat) : C.textMid,
                        }}>{cat}</button>
                      ))}
                    </div>
                  </div>

                  {/* Descripción y monto */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input type="text" value={nuevoGastoDesc} onChange={(e) => setNuevoGastoDesc(e.target.value)} onKeyDown={(e) => e.key === "Enter" && agregarGasto()} placeholder="Descripción del egreso..." style={{ ...inp, flex: 2, minWidth: 160 }} />
                    <div style={{ position: "relative", flex: 1, minWidth: 110 }}>
                      <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.textLight, fontSize: 12 }}>$</span>
                      <input type="number" value={nuevoGastoMonto} onChange={(e) => setNuevoGastoMonto(e.target.value)} onKeyDown={(e) => e.key === "Enter" && agregarGasto()} placeholder="Monto" style={{ ...inp, paddingLeft: 24 }} />
                    </div>
                    <button onClick={agregarGasto} style={{
                      padding: "9px 18px", background: nuevoGastoMedio === "efectivo" ? C.green : C.cyan,
                      border: "none", borderRadius: 8, color: "#fff",
                      fontFamily: "inherit", fontWeight: 700, fontSize: 13, cursor: "pointer",
                    }}>+ Agregar</button>
                  </div>
                </div>

                {/* Filtros */}
                {dia.gastos.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                    {["TODAS", ...new Set(dia.gastos.map((g) => g.cat))].map((cat) => (
                      <button key={cat} onClick={() => setFiltroCat(cat)} style={{
                        padding: "5px 12px", borderRadius: 20, cursor: "pointer", fontSize: 12, fontFamily: "inherit",
                        background: filtroCat === cat ? (cat === "TODAS" ? C.text : `${catColor(cat)}15`) : "#fff",
                        border: filtroCat === cat ? (cat === "TODAS" ? `1px solid ${C.text}` : `1px solid ${catColor(cat)}`) : `1px solid ${C.border}`,
                        color: filtroCat === cat ? (cat === "TODAS" ? "#fff" : catColor(cat)) : C.textMid,
                        fontWeight: filtroCat === cat ? 600 : 400,
                      }}>{cat === "TODAS" ? "Todos" : cat}</button>
                    ))}
                  </div>
                )}

                {/* Lista */}
                {gastosFiltrados.length === 0 ? (
                  <div style={{ textAlign: "center", color: C.textLight, padding: "40px 0", fontSize: 13 }}>
                    {dia.gastos.length === 0 ? "Sin egresos registrados" : "Sin egresos en esta categoría"}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {gastosFiltrados.map((g, i) => {
                      const col = catColor(g.cat);
                      const realIdx = dia.gastos.indexOf(g);
                      const esEfectivo = g.medio === "efectivo";
                      return (
                        <div key={i} style={{
                          background: C.surface, border: `1px solid ${C.border}`,
                          borderLeft: `4px solid ${esEfectivo ? C.green : C.cyan}`,
                          borderRadius: 8, padding: "11px 14px",
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: 18 }}>{esEfectivo ? "💵" : "🏦"}</span>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{g.desc}</div>
                              <div style={{ display: "flex", gap: 6, marginTop: 3 }}>
                                <span style={{ fontSize: 10, fontWeight: 600, color: col, background: `${col}15`, padding: "1px 7px", borderRadius: 10 }}>{g.cat}</span>
                                <span style={{ fontSize: 10, color: esEfectivo ? C.green : C.cyan, fontWeight: 600 }}>{esEfectivo ? "Efectivo" : "Banco/Transfer."}</span>
                              </div>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{formatPesos(parseNum(g.monto))}</span>
                            <button onClick={() => eliminarGasto(realIdx)} style={{
                              background: "transparent", border: `1px solid ${C.border}`, color: C.textLight,
                              borderRadius: 5, width: 26, height: 26, cursor: "pointer", fontSize: 16,
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>×</button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Totales */}
                    <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 8 }}>
                      {filtroCat === "TODAS" && gastosEfectivo > 0 && gastosBanco > 0 && (
                        <div style={{ display: "flex", gap: 8 }}>
                          <div style={{ flex: 1, padding: "10px 14px", background: "#eafaf1", border: `1px solid ${C.green}33`, borderRadius: 8, display: "flex", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>💵 Efectivo</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: C.green }}>{formatPesos(gastosEfectivo)}</span>
                          </div>
                          <div style={{ flex: 1, padding: "10px 14px", background: "#e8f8fd", border: `1px solid ${C.cyan}33`, borderRadius: 8, display: "flex", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 12, color: C.cyan, fontWeight: 600 }}>🏦 Banco</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: C.cyan }}>{formatPesos(gastosBanco)}</span>
                          </div>
                        </div>
                      )}
                      <div style={{ padding: "12px 16px", background: "#fdf3f2", border: `1px solid ${C.red}33`, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 13, color: C.red, fontWeight: 700 }}>{filtroCat === "TODAS" ? "Total egresos" : `Total — ${filtroCat}`}</span>
                        <span style={{ fontSize: 20, fontWeight: 800, color: C.red }}>{formatPesos(totalFiltrado)}</span>
                      </div>
                      {filtroCat === "TODAS" && totalesPorCat.length > 1 && (
                        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 16px" }}>
                          <div style={{ fontSize: 11, color: C.textLight, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Desglose por categoría</div>
                          {totalesPorCat.map(({ cat, total }) => (
                            <div key={cat} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.bg}` }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ width: 8, height: 8, borderRadius: "50%", background: catColor(cat) }} />
                                <span style={{ fontSize: 12, color: C.textMid }}>{cat}</span>
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{formatPesos(total)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ====== RESUMEN ====== */}
            {tab === "resumen" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.textMid, textTransform: "uppercase", letterSpacing: "0.08em" }}>Desglose por local</div>
                {LOCALES.map((local, li) => {
                  const col = ACCENT_COLORS[li];
                  const v = dia.locales[local];
                  const tot = totalLocal(local);
                  return (
                    <div key={local} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
                      <div style={{ background: col, padding: "10px 16px", display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", letterSpacing: "0.1em" }}>{local}</span>
                        <span style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{formatPesos(tot)}</span>
                      </div>
                      <div style={{ padding: "12px 16px", display: "flex", gap: 16, flexWrap: "wrap" }}>
                        {[["💵 Efectivo", parseNum(v.efectivo)],["💳 Débito", parseNum(v.debito)],["💳 Crédito", parseNum(v.credito)],["📲 Transfer.", parseNum(v.transferencia)]].map(([label, val]) => (
                          <div key={label} style={{ fontSize: 12, color: val > 0 ? C.textMid : C.textLight }}>
                            {label}: <span style={{ fontWeight: 600, color: val > 0 ? C.text : C.textLight }}>{formatPesos(val)}</span>
                            {val > 0 && tot > 0 && <span style={{ fontSize: 10, color: C.textLight, marginLeft: 4 }}>({pct(val,tot)}%)</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", marginTop: 4 }}>
                  <div style={{ background: C.text, padding: "11px 16px" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", letterSpacing: "0.06em" }}>Cierre de caja</span>
                  </div>
                  <div style={{ padding: 18 }}>
                    {[
                      ["Total ventas del día", totalVentasGeneral, C.text],
                      ["Efectivo cobrado (bruto)", totalVentasEfectivo, C.blue],
                      ["Egresos en efectivo", gastosEfectivo, C.red],
                      ["Egresos banco/transfer.", gastosBanco, C.textMid],
                      ["Total egresos", totalGastos, C.red],
                    ].map(([label, val, col]) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${C.bg}` }}>
                        <span style={{ fontSize: 13, color: C.textMid }}>{label}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: col }}>{formatPesos(val)}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 16, marginTop: 4 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Efectivo neto en caja</div>
                        <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>efectivo cobrado − egresos en efectivo</div>
                      </div>
                      <span style={{ fontSize: 28, fontWeight: 800, color: totalEfectivoNeto >= 0 ? C.green : C.red }}>
                        {formatPesos(totalEfectivoNeto)}
                      </span>
                    </div>
                  </div>
                </div>

                {dia.gastos.length > 0 && (
                  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.textMid, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Detalle egresos</div>
                    {dia.gastos.map((g, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.bg}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 14 }}>{g.medio === "efectivo" ? "💵" : "🏦"}</span>
                          <span style={{ fontSize: 13, color: C.text }}>{g.desc}</span>
                          <span style={{ fontSize: 10, fontWeight: 600, color: catColor(g.cat), background: `${catColor(g.cat)}15`, padding: "1px 7px", borderRadius: 10 }}>{g.cat}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{formatPesos(parseNum(g.monto))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ====== HISTORIAL ====== */}
            {tab === "historial" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.textMid, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                  Todos los días — {dias.length} registrado{dias.length !== 1 ? "s" : ""}
                </div>

                {dias.length > 1 && (() => {
                  const acum = dias.reduce((acc, d) => {
                    const c = calcDia(d);
                    return { ventas: acc.ventas + c.totalVentasGeneral, efectivo: acc.efectivo + c.totalVentasEfectivo, gastos: acc.gastos + c.totalGastos, neto: acc.neto + c.totalEfectivoNeto };
                  }, { ventas: 0, efectivo: 0, gastos: 0, neto: 0 });
                  return (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 8 }}>
                      {[["Ventas total", acum.ventas, C.text, "#f0f4ff"],["Efectivo bruto", acum.efectivo, C.blue, "#e8f4fd"],["Egresos total", acum.gastos, C.red, "#fdf3f2"],["Efectivo neto", acum.neto, acum.neto >= 0 ? C.green : C.red, acum.neto >= 0 ? "#eafaf1" : "#fdf3f2"]].map(([label, val, col, bg]) => (
                        <div key={label} style={{ background: bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
                          <div style={{ fontSize: 10, color: C.textLight, marginBottom: 4, fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: col }}>{formatPesos(val)}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {[...dias].sort((a, b) => b.fecha.localeCompare(a.fecha)).map((d) => {
                  const realIdx = dias.indexOf(d);
                  const c = calcDia(d);
                  const isExp = historialExpandido === realIdx;
                  const esActivo = realIdx === diaActivo;
                  return (
                    <div key={realIdx} style={{ background: C.surface, border: `1px solid ${esActivo ? C.red : C.border}`, borderRadius: 10, overflow: "hidden", boxShadow: esActivo ? `0 0 0 2px ${C.red}22` : "none" }}>
                      <div onClick={() => setHistorialExpandido(isExp ? null : realIdx)} style={{
                        padding: "12px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8,
                        background: isExp ? "#fafbfc" : "transparent",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {esActivo && <span style={{ fontSize: 10, background: C.red, color: "#fff", padding: "2px 7px", borderRadius: 4, fontWeight: 700 }}>HOY</span>}
                          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{formatFechaLarga(d.fecha)}</span>
                          {d.gastos.length > 0 && (
                            <span style={{ fontSize: 11, color: C.textLight, background: C.bg, padding: "2px 8px", borderRadius: 4 }}>
                              {d.gastos.length} egreso{d.gastos.length !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 10, color: C.textLight }}>Ventas</div>
                            <div style={{ fontSize: 14, fontWeight: 700 }}>{formatPesos(c.totalVentasGeneral)}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 10, color: C.textLight }}>Neto caja</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: c.totalEfectivoNeto >= 0 ? C.green : C.red }}>{formatPesos(c.totalEfectivoNeto)}</div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); setDiaActivo(realIdx); setTab("ventas"); }} style={{
                            padding: "5px 12px", background: C.red, border: "none", color: "#fff",
                            borderRadius: 6, fontSize: 11, fontFamily: "inherit", fontWeight: 600, cursor: "pointer",
                          }}>Editar</button>
                          <span style={{ color: C.textLight, fontSize: 12 }}>{isExp ? "▲" : "▼"}</span>
                        </div>
                      </div>

                      {isExp && (
                        <div style={{ borderTop: `1px solid ${C.border}`, padding: "14px 16px", background: C.bg }}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8, marginBottom: 12 }}>
                            {LOCALES.map((local, li) => {
                              const col = ACCENT_COLORS[li];
                              const v = d.locales[local];
                              const tot = c.totalLocal(local);
                              return (
                                <div key={local} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
                                  <div style={{ background: col, padding: "6px 12px" }}>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>{local}</span>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", float: "right" }}>{formatPesos(tot)}</span>
                                  </div>
                                  <div style={{ padding: "8px 12px" }}>
                                    {[["💵", parseNum(v.efectivo)],["💳D", parseNum(v.debito)],["💳C", parseNum(v.credito)],["📲", parseNum(v.transferencia)]].map(([icon, val]) =>
                                      val > 0 ? (
                                        <div key={icon} style={{ fontSize: 11, color: C.textMid, display: "flex", justifyContent: "space-between" }}>
                                          <span>{icon}</span><span>{formatPesos(val)}</span>
                                        </div>
                                      ) : null
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {d.gastos.length > 0 && (
                            <div style={{ marginBottom: 12 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: C.textMid, textTransform: "uppercase", marginBottom: 6 }}>Egresos</div>
                              {d.gastos.map((g, i) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                    <span>{g.medio === "efectivo" ? "💵" : "🏦"}</span>
                                    <span style={{ color: C.textMid }}>{g.desc}</span>
                                    {g.cat && <span style={{ fontSize: 10, color: catColor(g.cat), background: `${catColor(g.cat)}15`, padding: "1px 6px", borderRadius: 10 }}>{g.cat}</span>}
                                  </div>
                                  <span style={{ fontWeight: 600, color: C.text }}>{formatPesos(parseNum(g.monto))}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                            {[["Efectivo bruto", c.totalVentasEfectivo, C.blue],["Egresos efectivo", c.gastosEfectivo, C.red],["Neto en caja", c.totalEfectivoNeto, c.totalEfectivoNeto >= 0 ? C.green : C.red]].map(([label, val, col]) => (
                              <div key={label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px" }}>
                                <div style={{ fontSize: 10, color: C.textLight, marginBottom: 2 }}>{label}</div>
                                <div style={{ fontSize: 16, fontWeight: 800, color: col }}>{formatPesos(val)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
