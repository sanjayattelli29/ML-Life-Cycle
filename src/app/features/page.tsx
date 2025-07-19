import React from 'react';
import Image from 'next/image';

export default function FeaturesPage() {
  const skills = {
    programmingLanguages: ['Python', 'HTML', 'CSS', 'JavaScript', 'ReactJS', 'Node.JS', 'C++', 'Tailwind CSS'],
    devTools: ['Git', 'GitHub', 'AWS', 'Netlify', 'VS Code', 'Render', 'AWS Lambda', 'AWS EC2'],
    uiuxDesign: ['Adobe XD', 'Figma', 'Miro', 'Framer', 'Adobe Illustrator', 'PhotoShop', 'Sketch'],
    frameworks: ['Google Cloud', 'ReactJS', 'Bootstrap', 'Material-UI', 'React Native', 'Flutter'],
    vibeCodingTools: ['Lovable.AI', 'Relume.AI', 'bolt.new', 'FlowMapp', 'protopie', 'Figma Jam', 'Build.io', 'Supabase'],
    databaseBackend: ['MongoDB', 'MySQL', 'PostgreSQL', 'Supabase', 'Clerk', 'Firebase', 'PlanetScale', 'Neon']
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Hi, I am <span className="text-blue-600">Sanjay Kumar</span>
            </h1>
            <p className="text-lg text-slate-700 mb-6">
              Full Stack Developer | SaaS Builder | DSA & Problem Solving Enthusiast 🚀💻
            </p>
            <p className="text-slate-600 mb-8">
              Crafting scalable, high-performance web apps with clean code & intuitive UX 🌐✨ 
              Passionate about solving problems through clean code and innovative solutions 💡🚀
            </p>
            <button className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-lg">
              Get in Touch
            </button>
          </div>
          <div className="relative h-[400px] rounded-2xl overflow-hidden shadow-2xl">
            <Image
              src="https://designwithsanjay.site/static/media/HeroImage.96b29a6adf82c5484dc6.jpg"
              alt="Sanjay Kumar"
              fill
              style={{ objectFit: 'cover' }}
              className="rounded-2xl"
            />
          </div>
        </div>
      </div>

      {/* Skills Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">Skills & Expertise</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Object.entries(skills).map(([category, items]) => (
            <div key={category} className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200">
              <h3 className="text-xl font-semibold text-blue-600 mb-4 capitalize">
                {category.replace(/([A-Z])/g, ' $1').trim()}
              </h3>
              <div className="flex flex-wrap gap-2">
                {items.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
