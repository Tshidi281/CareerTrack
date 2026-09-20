document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-confirm]').forEach(el => {
    el.addEventListener('submit', (e) => {
      if (!confirm(el.getAttribute('data-confirm'))) e.preventDefault();
    });
  });

  document.querySelectorAll('[data-confirm-click]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (!confirm(el.getAttribute('data-confirm-click'))) e.preventDefault();
    });
  });
});
