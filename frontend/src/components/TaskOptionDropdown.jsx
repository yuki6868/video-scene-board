import { useEffect, useMemo, useRef, useState } from "react";

function TaskOptionDropdown({
  value,
  options,
  placeholder = "選択してください",
  onChange,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const rootRef = useRef(null);

  const selectedOption = useMemo(
    () => options.find((option) => String(option.value) === String(value)) || null,
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(q)
    );
  }, [options, keyword]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (nextValue) => {
    onChange(nextValue);
    setIsOpen(false);
    setKeyword("");
  };

  return (
    <div className={`task-option-dropdown ${disabled ? "is-disabled" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="task-option-trigger"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <span className="task-option-caret">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && !disabled ? (
        <div className="task-option-menu">
          <input
            type="text"
            className="task-option-search"
            placeholder="絞り込み"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />

          <div className="task-option-list">
            {filteredOptions.length === 0 ? (
              <div className="task-option-empty">候補がありません</div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`task-option-item ${
                    String(option.value) === String(value) ? "is-selected" : ""
                  }`}
                  onClick={() => handleSelect(option.value)}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default TaskOptionDropdown;