# Why not HTML?

HTML is the best universal view layer. COP should render to HTML.

But HTML should not be the canonical source for COP because:

- DOM structure mixes content, layout, and presentation;
- CSS and wrapper elements add model parsing noise;
- database mapping requires cleanup;
- graph relations are not first-class;
- operations and audit logs are awkward to represent;
- HTML security risks grow when scripts and external resources are allowed.

COP treats HTML as a rendered export or viewer format.
