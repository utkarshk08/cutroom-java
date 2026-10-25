import { TEXT_STYLES } from "../utils/design";

export default function TextPanel({ piece, onChange }) {
  function changeStyle(id) {
    const style = TEXT_STYLES.find((item) => item.id === id);
    const { id: unusedId, name: unusedName, ...appearance } = style;
    onChange({
      bold: false,
      italic: false,
      background: "transparent",
      ...appearance,
      textStyle: id,
    });
  }

  return (
    <section className="stack">
      <h3>Text appearance</h3>
      <label className="field">
        Your words
        <textarea
          value={piece.text}
          maxLength={2000}
          onChange={(event) =>
            onChange({ text: event.target.value, name: event.target.value.slice(0, 30) || "Text" })
          }
        />
      </label>
      <label className="field">
        Style collection
        <select value={piece.textStyle} onChange={(event) => changeStyle(event.target.value)}>
          {TEXT_STYLES.map((style) => (
            <option key={style.id} value={style.id}>
              {style.name}
            </option>
          ))}
        </select>
      </label>
      <div className="form-grid">
        <label className="field">
          Font size (px)
          <input
            type="number"
            min={8}
            max={200}
            value={piece.fontSize}
            onChange={(event) =>
              onChange({ fontSize: Math.max(8, Math.min(200, Number(event.target.value))) })
            }
          />
        </label>
        <label className="field">
          Text color
          <input
            type="color"
            value={piece.color}
            onChange={(event) => onChange({ color: event.target.value })}
          />
        </label>
      </div>
      <div className="inline">
        <button
          className="btn secondary"
          aria-label="Bold"
          aria-pressed={piece.bold}
          onClick={() => onChange({ bold: !piece.bold })}
        >
          <b>B</b>
        </button>
        <button
          className="btn secondary"
          aria-label="Italic"
          aria-pressed={piece.italic}
          onClick={() => onChange({ italic: !piece.italic })}
        >
          <i>I</i>
        </button>
        <button
          className="btn secondary"
          aria-label="Underline"
          aria-pressed={piece.underline}
          onClick={() => onChange({ underline: !piece.underline })}
        >
          <u>U</u>
        </button>
      </div>
      <label className="field">
        Text background
        <input
          type="color"
          value={piece.background === "transparent" ? "#ffffff" : piece.background}
          onChange={(event) => onChange({ background: event.target.value })}
        />
      </label>
      <button className="btn secondary" onClick={() => onChange({ background: "transparent" })}>
        Remove text background
      </button>
      <p className="muted">
        Text boxes have no padding. Set width and height above; this simple edition does not measure
        glyph-tight bounds.
      </p>
    </section>
  );
}
