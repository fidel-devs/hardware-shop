# Savanna Bites restaurant website

A mobile-first restaurant demo built with plain HTML, CSS and vanilla JavaScript.

## Project files
- `index.html` — page structure, navigation, menu section, cart, order form, restaurant story and contact details.
- `styles.css` — colours, typography, card styling, responsive layouts, mobile navigation and accessible focus states.
- `script.js` — sample menu data, category filters, search, cart quantities, subtotal calculation, form validation and WhatsApp message creation.

## Run locally
1. Extract the ZIP file.
2. Open `index.html` in a modern browser. For a more reliable development setup, open the folder in Visual Studio Code and use the Live Server extension.
3. Internet access is needed for the Google Fonts and remote Unsplash food photos. The menu and cart logic run locally in the browser.

## Customize before publishing
1. In `index.html`, replace `Savanna Bites`, address, phone, hours and the Google Maps search URL with the real restaurant details.
2. In `script.js`, change `WHATSAPP_NUMBER` to the restaurant's WhatsApp number in international format with digits only. Example for a Kenyan number: `2547XXXXXXXX` (no plus sign or spaces).
3. Edit the `menuItems` array in `script.js` to change food names, categories, descriptions, prices and photo URLs. Categories currently used are `mains`, `grill`, `sides`, and `drinks`.
4. Replace the placeholder prices and confirm whether delivery fees, taxes or deposits should be shown. This demo only calculates the food subtotal.
5. Test every photo URL and use images you have permission to publish.

## WhatsApp limitation
The site opens WhatsApp with a prefilled order message. The customer must review and press **Send** inside WhatsApp. A normal static website cannot reliably know whether the message was sent, delivered, read, or accepted by the restaurant. The site therefore does not claim that an order was received.

## Test checklist
- [ ] Open the site on a phone-sized screen and a desktop screen.
- [ ] Use each category button; confirm only matching dishes appear and `aria-pressed` changes.
- [ ] Search for “chicken”, then search for a term with no matches; clear the search.
- [ ] Add several items; verify cart count and subtotal.
- [ ] Increase and decrease quantities; remove an item; verify totals update and zero quantities remove the item.
- [ ] Try submitting with an empty cart.
- [ ] Add an item and submit with a blank name or a one-character name; confirm validation appears.
- [ ] Enter a valid name, choose Pickup/Delivery/Dine-in, add notes and click Order via WhatsApp.
- [ ] Confirm WhatsApp opens with the correct item names, quantities, subtotal, name, order type and notes. Do not send a test order to a real business without permission.
- [ ] Test the mobile navigation menu and all section links.
- [ ] Check the phone number, address, opening hours, map link and call link after customizing.
- [ ] Test keyboard navigation with Tab and Enter; verify focus outlines are visible.

## Deploy
You can publish these static files with GitHub Pages, Netlify, or Cloudflare Pages:
- Upload the extracted project folder/repository.
- Set the publish/root directory to the folder containing `index.html`.
- No build command is needed.
- After deployment, test the live website on a phone and open the WhatsApp link on a device where WhatsApp is available.
