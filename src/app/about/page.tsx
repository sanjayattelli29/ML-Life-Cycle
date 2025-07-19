import React from 'react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Project Overview */}
        <div className="mb-16">
          <h1 className="text-4xl font-bold text-slate-900 mb-8 text-center">
            About Data-VizAI
          </h1>
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-semibold text-blue-600 mb-4">Project Overview</h2>
            <p className="text-slate-700 mb-4">
              Data-VizAI is a cutting-edge data visualization platform that combines the power of artificial intelligence
              with intuitive visualization tools. Our platform helps users transform complex data into meaningful,
              interactive visualizations that tell compelling stories.
            </p>
            <p className="text-slate-700 mb-4">
              Built with modern technologies and best practices, Data-VizAI offers a seamless experience for data
              analysis, visualization, and sharing insights across teams.
            </p>
          </div>
        </div>

        {/* Developer Profile */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-16">
          <h2 className="text-2xl font-semibold text-blue-600 mb-6">Meet the Developer</h2>
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Sanjay Kumar</h3>
              <p className="text-slate-700 mb-4">
                Full Stack Developer with a passion for building scalable applications and solving complex problems.
                With extensive experience in modern web technologies and a keen eye for design, I strive to create
                applications that are both powerful and user-friendly.
              </p>
              <div className="space-y-2">
                <p className="text-slate-700">
                  <span className="font-medium text-slate-900">Specialization:</span> Full Stack Development, Data Visualization, AI Integration
                </p>
                <p className="text-slate-700">
                  <span className="font-medium text-slate-900">Experience:</span> 2+ years in web development
                </p>
                <p className="text-slate-700">
                  <span className="font-medium text-slate-900">Focus:</span> Creating intuitive, high-performance applications
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Technology Stack */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-blue-600 mb-6">Technology Stack</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-900">Frontend</h3>
              <p className="text-slate-700">Next.js, React, TypeScript, Tailwind CSS</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-900">Backend</h3>
              <p className="text-slate-700">Node.js, MongoDB, REST APIs</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-900">AI/ML</h3>
              <p className="text-slate-700">Python, TensorFlow, Data Analysis</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-900">Cloud & DevOps</h3>
              <p className="text-slate-700">AWS, Docker, CI/CD</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-900">Tools</h3>
              <p className="text-slate-700">Git, VS Code, Figma</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-900">Testing</h3>
              <p className="text-slate-700">Jest, React Testing Library</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
