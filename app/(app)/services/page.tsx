const steps = [
  {
    title: "Intake and Strategy Call",
    copy: "A human career strategist maps your target roles, compensation band, location constraints, and weekly execution goals.",
  },
  {
    title: "Research and Job List Building",
    copy: "Our human operations team builds role shortlists from vetted company pages, referrals, and hiring networks.",
  },
  {
    title: "Manual Application Execution",
    copy: "Every application is completed by a human specialist with quality checks before submission.",
  },
  {
    title: "Daily Tracking and Follow-Up",
    copy: "Our team updates your pipeline, follows up on stale applications, and keeps your dashboard analytics accurate.",
  },
  {
    title: "Interview and Offer Support",
    copy: "Human coaches run prep sessions, feedback loops, and negotiation support through final offer stage.",
  },
];

const plans = [
  {
    name: "Launch",
    price: "$199",
    period: "/month",
    badge: "Human Managed",
    subtitle: "For candidates who need structured execution with strict weekly accountability.",
    features: [
      "1 strategist check-in per week (human)",
      "40 manually submitted applications/month",
      "Manual pipeline tracking + stale follow-up",
      "Weekly analytics report with conversion notes",
      "Support response in under 24 hours",
    ],
  },
  {
    name: "Growth",
    price: "$499",
    period: "/month",
    badge: "Best ROI",
    subtitle: "For serious job seekers who want full-service human execution.",
    features: [
      "2 strategist calls per week (human)",
      "120 manually submitted applications/month",
      "Dedicated operations associate for tracking",
      "Manual outreach and recruiter follow-up",
      "Interview prep and feedback after each round",
    ],
  },
  {
    name: "Elite",
    price: "$1,200",
    period: "/month",
    badge: "White Glove",
    subtitle: "For leadership candidates needing high-touch search management.",
    features: [
      "Dedicated strategist + dedicated coordinator",
      "Unlimited managed applications (human-reviewed)",
      "Referral pipeline and warm intro support",
      "Compensation and offer negotiation coaching",
      "Same-day support during active interview loops",
    ],
  },
];

const businessPlan = [
  "Primary revenue: monthly subscription plans with strong gross margin through standardized human workflows.",
  "Secondary revenue: interview coaching add-ons, salary negotiation packages, and executive search acceleration.",
  "Cost control: centralized operations playbooks, shared QA checklists, and region-based staffing for predictable delivery cost.",
  "Retention model: dashboard analytics + weekly strategy reviews keep users engaged through the full search lifecycle.",
  "Target profitability: positive unit economics at >70 active Growth-equivalent subscribers.",
];

export default function ServicesPage() {
  return (
    <div>
      <div className="services-hero">
        <h1 className="section-title">
          Human-Led Job Search <span>Operations</span>
        </h1>
        <p className="section-subtitle">
          JobFlow runs as a complete human service: planning, application execution, tracking, follow-up, and interview support.
        </p>
      </div>

      <h2 className="subsection-title">How We Deliver</h2>
      <div className="grid-three">
        {steps.map((step, index) => (
          <div className="card service-step" key={step.title}>
            <div className="kpi-title">0{index + 1}</div>
            <h3>{step.title}</h3>
            <p className="kpi-title">{step.copy}</p>
          </div>
        ))}
      </div>

      <h2 className="subsection-title" style={{ marginTop: "30px", textAlign: "center" }}>
        Human Service Plans
      </h2>
      <p className="section-subtitle" style={{ textAlign: "center" }}>
        Designed for sustainable profitability and measurable candidate outcomes.
      </p>

      <div className="grid-three" style={{ marginTop: "18px" }}>
        {plans.map((plan) => (
          <div className={`card ${plan.name === "Growth" ? "featured-plan" : ""}`} key={plan.name}>
            <div className="plan-head">
              {plan.badge ? <span className="badge">{plan.badge}</span> : <span />}
              <h3>{plan.name}</h3>
              <p className="kpi-title">{plan.subtitle}</p>
            </div>
            <p className="price">
              {plan.price}
              <span>{plan.period}</span>
            </p>
            <ul className="plan-list">
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <button type="button" className={`btn ${plan.name === "Growth" ? "btn-primary" : "btn-secondary"}`}>
              {plan.name === "Elite" ? "Book strategy call" : "Start plan"}
            </button>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h2 className="subsection-title" style={{ marginTop: 0 }}>Business Plan Snapshot</h2>
        <ul className="plan-list">
          {businessPlan.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
