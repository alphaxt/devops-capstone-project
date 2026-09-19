document.querySelectorAll(".delete-form").forEach((form) => {
  form.addEventListener("submit", (event) => {
    const description = form.dataset.expenseDescription || "this expense";
    const confirmed = window.confirm(`Delete “${description}”? This cannot be undone.`);

    if (!confirmed) {
      event.preventDefault();
    }
  });
});
