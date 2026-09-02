const props = {
  className: "col-icon",
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const IconUser = () => (
  <svg {...props}>
    <circle cx="8" cy="5" r="2.6" />
    <path d="M2.8 13.5c0-2.6 2.3-4.2 5.2-4.2s5.2 1.6 5.2 4.2" />
  </svg>
);

export const IconGauge = () => (
  <svg {...props}>
    <path d="M2.5 11.5a6 6 0 1 1 11 0" />
    <path d="M8 11.5 10.8 7" />
  </svg>
);

export const IconContract = () => (
  <svg {...props}>
    <path d="M4 2h5l3 3v9H4z" />
    <path d="M9 2v3h3M6 8.5h4M6 11h3" />
  </svg>
);

export const IconClock = () => (
  <svg {...props}>
    <circle cx="8" cy="8" r="5.8" />
    <path d="M8 4.8V8l2.2 1.4" />
  </svg>
);

export const IconMoney = () => (
  <svg {...props}>
    <path d="M8 2v12" />
    <path d="M10.8 4.6H6.7a1.9 1.9 0 0 0 0 3.8h2.6a1.9 1.9 0 0 1 0 3.8H5" />
  </svg>
);

export const IconFlow = () => (
  <svg {...props}>
    <circle cx="3.2" cy="8" r="1.6" />
    <circle cx="8" cy="8" r="1.6" />
    <circle cx="12.8" cy="8" r="1.6" />
    <path d="M4.8 8h1.6M9.6 8h1.6" />
  </svg>
);

export const IconSearch = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
    <circle cx="7.2" cy="7.2" r="4.6" />
    <path d="M10.6 10.6 13.6 13.6" />
  </svg>
);
