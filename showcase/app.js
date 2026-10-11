const approval = document.querySelector("#approval");
const updateSettlement = () => {
  const paid = Number(approval.value);
  const returned = 100 - paid;
  document.querySelector("#approval-label").textContent = `${paid} TEST`;
  document.querySelector("#student-amount").textContent = `${paid} TEST`;
  document.querySelector("#sponsor-amount").textContent = `${returned} TEST`;
  document.querySelector("#settlement-explanation").textContent =
    paid === 0
      ? "Claim rejected: the full 100 TEST returns to the sponsor."
      : `100 reserved = ${paid} paid + ${returned} returned.`;
};
approval.addEventListener("input", updateSettlement);

const views = {
  sponsor: {
    src: "assets/desktop.jpg",
    alt: "Sponsor workspace showing reserved grants, student payments and sponsor refunds.",
    caption:
      "Sponsor: reserve individual travel budgets and see approved payouts and returned funds.",
  },
  student: {
    src: "assets/student.jpg",
    alt: "Student workspace showing a 100 TEST travel grant and a synthetic 72 TEST receipt ready for submission.",
    caption:
      "Student: see the reserved grant and submit one travel expense with the original receipt.",
  },
  reviewer: {
    src: "assets/settlement.jpg",
    alt: "Reviewer settlement showing 72 TEST to the student and 28 TEST returned to the sponsor.",
    caption:
      "Reviewer: check the evidence, review the split and confirm one atomic settlement.",
  },
};
const tabs = [...document.querySelectorAll("[data-view]")];
function selectView(button) {
  const view = views[button.dataset.view];
  for (const tab of tabs) {
    const selected = tab === button;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  }
  document
    .querySelector("#product-panel")
    .setAttribute("aria-labelledby", button.id);
  const picture = document.querySelector("#product-image");
  picture.src = view.src;
  picture.alt = view.alt;
  document.querySelector("#product-caption").textContent = view.caption;
}
tabs.forEach((button, index) => {
  button.addEventListener("click", () => selectView(button));
  button.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
            tabs.length;
    selectView(tabs[next]);
    tabs[next].focus();
  });
});
