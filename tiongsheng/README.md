# Tiong Sheng Services: website preview

This is a clickable preview of the redesigned tiongshengservices.com. It has 9 pages:

- Home
- About
- Our Services
- Freight Transportation
- Logistics Services
- Transportation Rental
- Gallery
- Get a Quote
- Contact

It's a plain HTML/CSS/JS site, with no build step, so it can be hosted free on GitHub Pages.

## Put it on GitHub Pages

1. On GitHub, click **New repository** and give it a name, for example `tiong-sheng-preview`. You can make it Public, or Private if your GitHub plan allows Pages on private repos.
2. Unzip the download. In the new repo, click **Add file › Upload files**.
3. Drag in **everything inside** the unzipped folder, including the `assets` folder. Upload the contents, not the folder that contains them. `index.html` must sit at the top level of the repo.
4. Click **Commit changes**.
5. Go to **Settings › Pages**. Under *Build and deployment*, set Source to **Deploy from a branch**, Branch to **main**, and folder to **/ (root)**. Click **Save**.
6. After a minute or two, the link appears at the top of that page, in the form `https://<your-username>.github.io/tiong-sheng-preview/`.

## What's in the repo

| Path | What it is |
|---|---|
| `index.html` and the other `.html` files | One file per page |
| `assets/img/` | Logo and project photos |
| `assets/css/site.css` | Shared mobile fixes |
| `assets/js/dc-runtime.js` | Small script that draws each page and runs the tabs, gallery filter, photo viewer, FAQ and forms |
| `assets/js/morphdom-umd.min.js` | Open-source helper (MIT licence) that updates the page smoothly, so only the part that changes animates |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are |

## Good to know

- **The forms are a preview only.** *Submit* shows the thank-you message but doesn't send anything. On the real WordPress site, the Elementor Form widget emails `tss.transport@tiongshengservices.com`.
- **JavaScript must be on** to view the pages.
- **Placeholders to fill in.** Text in square brackets still needs the client's details: business hours, years of experience, trailer types and storage terms.
- **Editing text.** Each page's content is inside the `<template id="page-template">` block of its `.html` file. Edit it there and commit, and GitHub Pages updates within a minute or two.
