// Behavior for templates/gift_card.liquid: copy the code, draw the QR code
// (Shopify's vendor/qrcode.js), and print. Without JavaScript the code is
// still selectable text and the Copy / Print buttons stay hidden.

document.addEventListener('DOMContentLoaded', () => {
  const copyButton = document.querySelector('[data-copy-code]');
  const status = document.querySelector('[data-copy-status]');

  if (copyButton && navigator.clipboard) {
    const label = copyButton.textContent;
    copyButton.hidden = false;
    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(copyButton.dataset.copyCode);
        copyButton.textContent = copyButton.dataset.copiedLabel;
        copyButton.classList.add('is-copied');
        if (status) status.textContent = copyButton.dataset.copiedLabel;
        clearTimeout(copyButton.resetTimer);
        copyButton.resetTimer = setTimeout(() => {
          copyButton.textContent = label;
          copyButton.classList.remove('is-copied');
        }, 2000);
      } catch (error) {
        // Clipboard blocked: select the code so it can be copied by hand.
        const code = document.getElementById('GiftCardCode');
        if (code) window.getSelection()?.selectAllChildren(code);
      }
    });
  }

  const qr = document.querySelector('[data-qr-identifier]');
  if (qr && window.QRCode) {
    new window.QRCode(qr, {
      text: qr.dataset.qrIdentifier,
      width: 120,
      height: 120,
    });
  } else if (qr) {
    qr.closest('.gift-card__qr-wrap')?.setAttribute('hidden', '');
  }

  const printButton = document.querySelector('[data-print]');
  if (printButton) {
    printButton.hidden = false;
    printButton.addEventListener('click', () => window.print());
  }
});
