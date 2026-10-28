const scrollLocks = new WeakMap();

function focusableElements(container) {
  return [...container.querySelectorAll('button, [href], input, select, textarea, [tabindex], [contenteditable="true"]')]
    .filter((element) => element.tabIndex >= 0 && !element.matches(":disabled") && element.getClientRects().length);
}

export function trapTabKey(container, event) {
  if (event.key !== "Tab") return;
  const doc = container.ownerDocument;
  const elements = focusableElements(container);
  const first = elements[0];
  const last = elements.at(-1);
  if (!first) {
    event.preventDefault();
    container.focus();
  } else if (event.shiftKey && (doc.activeElement === first || doc.activeElement === container)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && doc.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

// Shared focus, keyboard and scroll lifecycle for native modal dialogs.
export function mountDialog(dialog, onDismiss) {
  const doc = dialog.ownerDocument;
  const opener = doc.activeElement;
  const fallback = opener?.closest(".admin-page")?.querySelector("h1");
  const lock = scrollLocks.get(doc) ?? { count: 0, overflow: doc.body.style.overflow };
  lock.count++;
  scrollLocks.set(doc, lock);
  doc.body.style.overflow = "hidden";

  dialog.showModal();
  (dialog.querySelector("[data-dialog-initial]") ?? focusableElements(dialog)[0] ?? dialog).focus();

  function onCancel(event) {
    event.preventDefault();
    onDismiss();
  }
  function onKeyDown(event) {
    trapTabKey(dialog, event);
  }
  dialog.addEventListener("cancel", onCancel);
  dialog.addEventListener("keydown", onKeyDown);

  return () => {
    dialog.removeEventListener("cancel", onCancel);
    dialog.removeEventListener("keydown", onKeyDown);
    if (dialog.open) dialog.close();
    if (--lock.count === 0) {
      doc.body.style.overflow = lock.overflow;
      scrollLocks.delete(doc);
    }
    if (opener?.isConnected && !opener.matches(":disabled")) {
      opener.focus();
    } else if (fallback?.isConnected) {
      const previous = fallback.getAttribute("tabindex");
      fallback.setAttribute("tabindex", "-1");
      fallback.focus();
      fallback.addEventListener("blur", () => {
        if (previous === null) fallback.removeAttribute("tabindex");
        else fallback.setAttribute("tabindex", previous);
      }, { once: true });
    }
  };
}
