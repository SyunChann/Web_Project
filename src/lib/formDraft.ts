export type FormSnapshot<T = unknown> = {
  fields: [string, string][];
  photos: { id: string; name: string; file: File }[];
  extra?: T;
};

export function captureForm<T>(form: HTMLFormElement, extra?: T): FormSnapshot<T> {
  const fields: [string, string][] = [];
  const photos: FormSnapshot["photos"] = [];
  const secrets = new Set(Array.from(form.querySelectorAll<HTMLInputElement>('input[type="password"]')).map((input) => input.name));
  for (const [name, value] of new FormData(form)) {
    if (name.startsWith("$ACTION_") || name === "return_to" || /captcha|token|password/i.test(name) || secrets.has(name)) continue;
    if (typeof value === "string") fields.push([name, value]);
    else if (value.size > 0) photos.push({ id: `${name}:${photos.length}`, name, file: value });
  }
  return { fields, photos, extra };
}

export function restoreForm(form: HTMLFormElement, snapshot: FormSnapshot): boolean {
  let filesRestored = true;
  for (const element of Array.from(form.elements)) {
    if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) || !element.name) continue;
    if (element instanceof HTMLInputElement && ["hidden", "password", "submit"].includes(element.type)) continue;
    const values = snapshot.fields.filter(([name]) => name === element.name).map(([, value]) => value);
    if (element instanceof HTMLInputElement && element.type === "file") {
      try {
        const transfer = new DataTransfer();
        snapshot.photos.filter((photo) => photo.name === element.name).forEach((photo) => transfer.items.add(photo.file));
        element.files = transfer.files;
      } catch { filesRestored = false; }
    } else if (element instanceof HTMLInputElement && ["checkbox", "radio"].includes(element.type)) {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "checked")?.set?.call(element, values.includes(element.value));
    } else if (element instanceof HTMLSelectElement && element.multiple) {
      for (const option of element.options) option.selected = values.includes(option.value);
    } else {
      const prototype = element instanceof HTMLInputElement ? HTMLInputElement.prototype : element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLTextAreaElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(element, values[0] ?? "");
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }
  return filesRestored;
}
