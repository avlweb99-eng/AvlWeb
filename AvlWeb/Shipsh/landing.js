const footerYear = document.querySelector("[data-current-year]");
const spotsLeft = document.querySelector("[data-spots-left]");

if (footerYear) {
  footerYear.textContent = String(new Date().getFullYear());
}

if (spotsLeft) {
  const values = ["47", "43", "41", "39"];
  let index = 0;

  window.setInterval(() => {
    index = (index + 1) % values.length;
    spotsLeft.textContent = values[index];
  }, 1600);
}
