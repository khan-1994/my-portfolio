# Police Clearance Certificate Application Form

A responsive, browser-based application form for a Police Clearance Certificate addressed to the Police Facilitation Centre, Shaheed Benazirabad.

## Live website

https://khan-1994.github.io/my-portfolio/

## Features

- Responsive layout for desktop and mobile screens
- Applicant photo preview
- Single-purpose selection and conditional passport/address fields
- CNIC and mobile-number input masks
- Required-field and date validation
- Dynamic address sections and residence-duration calculation
- Print-ready A4 application layout
- Clear/reset form action

## Run locally

1. Download or clone this repository.
2. Open `index.html` in a modern browser.
3. Fill out the form and use the print action to print the completed application.

The page uses plain HTML, CSS, and JavaScript. Google Fonts are loaded from Google's font CDN when an internet connection is available.

## Deployment

The site is published with GitHub Pages. Commits pushed to `main` trigger the workflow in `.github/workflows/deploy-pages.yml`. Check the repository's **Actions** tab to verify a deployment.

## Privacy note

The form collects personal information such as CNIC, date of birth, address, and a photo in the browser UI. The current front-end JavaScript does not send form data to a server or save it to browser storage. Use a trusted device, avoid sharing completed form screenshots/files, and clear the form when finished. Printing may create a paper or PDF copy containing personal information.

## Important

This is an unofficial digital form interface, not an official government submission portal. Confirm requirements with the relevant police office before relying on the form.
