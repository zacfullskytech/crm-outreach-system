"use client";

type CustomFieldPair = {
  id: string;
  key: string;
  value: string;
};

export function CustomFieldsEditor({
  entity,
  fields,
  onChange,
}: {
  entity: string;
  fields: CustomFieldPair[];
  onChange: (next: CustomFieldPair[]) => void;
}) {
  function updateField(id: string, patch: Partial<CustomFieldPair>) {
    onChange(fields.map((field) => (field.id === id ? { ...field, ...patch } : field)));
  }

  function addField() {
    onChange([...fields, { id: `${Date.now()}-${Math.random()}`, key: "", value: "" }]);
  }

  function removeField(id: string) {
    onChange(fields.filter((field) => field.id !== id));
  }

  return (
    <div className="inline-grid">
      <div className="card">
        <h3>Custom Classification Fields</h3>
        <p className="help">
          Add your own filtering fields for this {entity}. Keys become available for segmentation and internal classification.
        </p>
        <div className="inline-grid">
          {fields.length === 0 ? <p className="help">No custom fields yet.</p> : null}
          {fields.map((field, index) => (
            <div key={field.id} className="form-grid">
              <div className="field">
                <label htmlFor={`${entity}-custom-key-${index}`}>Field key</label>
                <input
                  id={`${entity}-custom-key-${index}`}
                  value={field.key}
                  onChange={(event) => updateField(field.id, { key: event.target.value })}
                  placeholder="territory"
                />
              </div>
              <div className="field">
                <label htmlFor={`${entity}-custom-value-${index}`}>Value</label>
                <input
                  id={`${entity}-custom-value-${index}`}
                  value={field.value}
                  onChange={(event) => updateField(field.id, { value: event.target.value })}
                  placeholder="north-texas"
                />
              </div>
              <div className="actions">
                <button className="button secondary" type="button" onClick={() => removeField(field.id)}>
                  Remove Field
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="actions">
          <button className="button secondary" type="button" onClick={addField}>
            Add Field
          </button>
        </div>
      </div>
    </div>
  );
}
