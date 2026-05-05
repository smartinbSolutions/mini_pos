import { Edit2, Plus, Save, Trash2, X } from "lucide-react";
import { useState } from "react";

const emptyUnit = { name: "", latinName: "", code: "" };

export default function UnitManager({
  units,
  saving,
  onCreate,
  onUpdate,
  onDelete,
}) {
  const [draft, setDraft] = useState(emptyUnit);
  const [editingId, setEditingId] = useState(null);
  const [editing, setEditing] = useState(emptyUnit);

  const submitDraft = async (event) => {
    event.preventDefault();
    await onCreate(draft);
    setDraft(emptyUnit);
  };

  const startEdit = (unit) => {
    setEditingId(unit.id);
    setEditing({
      id: unit.id,
      name: unit.name || "",
      latinName: unit.latinName || "",
      code: unit.code || "",
    });
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    await onUpdate(editing);
    setEditingId(null);
    setEditing(emptyUnit);
  };

  return (
    <aside className="rounded-lg bg-white p-4 shadow">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Units</h2>
        <p className="text-sm text-gray-500">Used by product inventory.</p>
      </div>

      <form onSubmit={submitDraft} className="mb-4 grid gap-2">
        <input
          required
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
          placeholder="Unit name"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            value={draft.latinName}
            onChange={(event) =>
              setDraft({ ...draft, latinName: event.target.value })
            }
            className="rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="Latin"
          />
          <input
            value={draft.code}
            onChange={(event) =>
              setDraft({ ...draft, code: event.target.value })
            }
            className="rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="Code"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded bg-gray-900 px-3 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-60"
        >
          <Plus size={16} />
          Add unit
        </button>
      </form>

      <div className="grid gap-2">
        {units.map((unit) =>
          editingId === unit.id ? (
            <form
              key={unit.id}
              onSubmit={submitEdit}
              className="rounded border border-blue-200 bg-blue-50 p-3"
            >
              <input
                required
                value={editing.name}
                onChange={(event) =>
                  setEditing({ ...editing, name: event.target.value })
                }
                className="mb-2 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
              <div className="mb-2 grid grid-cols-2 gap-2">
                <input
                  value={editing.latinName}
                  onChange={(event) =>
                    setEditing({ ...editing, latinName: event.target.value })
                  }
                  className="rounded border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Latin"
                />
                <input
                  value={editing.code}
                  onChange={(event) =>
                    setEditing({ ...editing, code: event.target.value })
                  }
                  className="rounded border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Code"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded bg-blue-600 px-3 py-2 text-sm text-white"
                >
                  <Save size={15} />
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="rounded border border-gray-300 p-2 text-gray-600"
                  aria-label="Cancel unit edit"
                >
                  <X size={16} />
                </button>
              </div>
            </form>
          ) : (
            <div
              key={unit.id}
              className="flex items-center justify-between rounded border border-gray-200 p-3"
            >
              <div className="min-w-0">
                <div className="truncate font-medium text-gray-900">
                  {unit.name}
                </div>
                <div className="truncate text-xs text-gray-500">
                  {[unit.latinName, unit.code].filter(Boolean).join(" / ") ||
                    "No code"}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(unit)}
                  className="rounded p-2 text-gray-500 hover:bg-gray-100"
                  aria-label="Edit unit"
                >
                  <Edit2 size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(unit)}
                  className="rounded p-2 text-red-500 hover:bg-red-50"
                  aria-label="Delete unit"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ),
        )}

        {units.length === 0 && (
          <div className="rounded border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
            No units yet
          </div>
        )}
      </div>
    </aside>
  );
}
