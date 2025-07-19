import React from 'react';

export default function PricingPage() {
  const plans = [
    {
      name: 'Starter',
      price: '$0',
      period: 'Free Forever',
      description: 'Perfect for individuals and small projects',
      features: [
        'Basic data visualization tools',
        'Up to 5 charts',
        'Standard templates',
        'Basic analytics',
        'Community support',
        'Export as PNG'
      ],
      buttonText: 'Get Started',
      popular: false
    },
    {
      name: 'Pro',
      price: '$29',
      period: 'per month',
      description: 'Ideal for professionals and growing teams',
      features: [
        'All Starter features',
        'Unlimited charts',
        'Advanced templates',
        'AI-powered insights',
        'Priority support',
        'Export in all formats',
        'Custom branding',
        'Team collaboration'
      ],
      buttonText: 'Start Pro Trial',
      popular: true
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'per month',
      description: 'For large organizations with specific needs',
      features: [
        'All Pro features',
        'Custom AI models',
        'API access',
        'Advanced security',
        'Dedicated support',
        'Custom integrations',
        'Training sessions',
        'SLA guarantees'
      ],
      buttonText: 'Contact Sales',
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-slate-600">
            Choose the plan that best fits your needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={"relative bg-white rounded-2xl shadow-xl p-8 " + 
                (plan.popular ? 'ring-2 ring-blue-600' : '')}
            >
              {plan.popular && (
                <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center px-4 py-1 rounded-full text-sm font-semibold bg-blue-600 text-white">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h2>
                <div className="flex items-baseline justify-center mb-2">
                  <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                  <span className="ml-2 text-slate-600">{plan.period}</span>
                </div>
                <p className="text-slate-600">{plan.description}</p>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <svg
                      className="h-6 w-6 text-blue-600 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-slate-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                className={"w-full py-3 px-6 rounded-lg text-center font-medium transition-all duration-200 " +
                  (plan.popular
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-slate-100 text-slate-900 hover:bg-slate-200')}
              >
                {plan.buttonText}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-slate-600">
            All plans include 14-day free trial. No credit card required.
          </p>
        </div>
      </div>
    </div>
  );
}
