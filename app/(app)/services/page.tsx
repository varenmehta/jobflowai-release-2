const steps = [
  {
    title: "Tell Us Your Goals",
    copy: "Share your target roles, salary range, and preferred companies.",
  },
  {
    title: "AI + Human Matching",
    copy: "We scan thousands of listings while human agents curate best-fit roles.",
  },
  {
    title: "We Apply For You",
    copy: "Tailored applications are submitted with optimized resumes and cover letters.",
  },
  {
    title: "Track & Interview",
    copy: "Every response flows into your dashboard with interview prep included.",
  },
];

const plans = [
  {
    name: "Starter",
    price: "$49",
    period: "/month",
    badge: "",
    subtitle: "For passive job seekers exploring new opportunities.",
    features: [
      "Up to 25 AI-assisted applications/month",
      "Email sync and auto status detection",
      "Basic dashboard + pipeline tracking",
      "Single resume performance tracking",
      "Standard support (48h)",
    ],
  },
  {
    name: "Pro",
    price: "$129",
    period: "/month",
    badge: "Most Popular",
    subtitle: "For active job seekers who want maximum reach and speed.",
    features: [
      "Unlimited AI-assisted applications",
      "Multi-resume strategy and version scoring",
      "Advanced analytics + funnel conversion insights",
      "Verified job board priority recommendations",
      "Priority support (24h)",
    ],
  },
  {
    name: "Executive",
    price: "$299",
    period: "/month",
    badge: "",
    subtitle: "White-glove service with a dedicated career strategist.",
    features: [
      "Unlimited AI-assisted applications",
      "Dedicated strategist and weekly review",
      "Custom outreach and referral workflow",
      "Mock interview prep + compensation review",
      "Priority escalation support (same-day)",
    ],
  },
];

export default function ServicesPage() {
  return (
    <div>
      <div className="services-hero">
        <h1 className="section-title">
          We Apply to Jobs <span>For You</span>
        </h1>
        <p className="section-subtitle">
          A hybrid human + AI service that applies, tracks, and optimizes your job search at scale.
        </p>
      </div>

      <h2 className="subsection-title">How It Works</h2>
      <div className="grid-four">
        {steps.map((step, index) => (
          <div className="card service-step" key={step.title}>
            <div className="kpi-title">0{index + 1}</div>
            <h3>{step.title}</h3>
            <p className="kpi-title">{step.copy}</p>
          </div>
        ))}
      </div>

      <h2 className="subsection-title" style={{ marginTop: "30px", textAlign: "center" }}>
        Pricing Plans
      </h2>
      <p className="section-subtitle" style={{ textAlign: "center" }}>
        Choose the plan that matches your job search intensity.
      </p>

      <div className="grid-three" style={{ marginTop: "18px" }}>
        {plans.map((plan) => (
          <div className={`card ${plan.name === "Pro" ? "featured-plan" : ""}`} key={plan.name}>
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
            <button type="button" className={`btn ${plan.name === "Pro" ? "btn-primary" : "btn-secondary"}`}>
              {plan.name === "Executive" ? "Book consultation" : "Choose plan"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
