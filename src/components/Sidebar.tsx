'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

import {
  LayoutDashboard,
  Table,
  Upload,
  ClipboardCheck,
  Brain,
  BarChart2,
  LineChart,
  PieChart,
  AreaChart,
  ScatterChart,
  Box,
  CircleDot,
  Radar,
  BarChartBig,
  TrendingUp,
  BarChart4
} from 'lucide-react';

const mainNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Data Table', href: '/dashboard/data-table', icon: Table },
  { name: 'Upload Dataset', href: '/dashboard/upload', icon: Upload },
  { name: 'Quality Metrics', href: '/dashboard/quality-metrics', icon: ClipboardCheck },
  { name: 'AI Analysis', href: '/dashboard/ai-analysis', icon: Brain },
  { name: 'Pre-processing', href: '/dashboard/pre-processing', icon: ClipboardCheck },
  { name: 'Knowledge', href: '/dashboard/knowledge', icon: Brain },
  { name: 'Metrics Guide', href: '/dashboard/metrics-guide', icon: BarChart4  },
  { name: 'Notes', href: '/dashboard/notes', icon: ClipboardCheck },
 
];

const chartNavigation = [
  { name: 'Bar Charts', href: '/dashboard/bar-charts', icon: BarChart2 },
  { name: 'Line Charts', href: '/dashboard/line-charts', icon: LineChart },
  { name: 'Pie Charts', href: '/dashboard/pie-charts', icon: PieChart },
  { name: 'Area Charts', href: '/dashboard/area-charts', icon: AreaChart },
  { name: 'Histogram', href: '/dashboard/histogram', icon: BarChartBig },
  { name: 'Scatter Plot', href: '/dashboard/scatter-plot', icon: ScatterChart },
  { name: 'Box Plot', href: '/dashboard/box-plot', icon: Box },
  { name: 'Bubble Chart', href: '/dashboard/bubble-chart', icon: CircleDot },
  { name: 'Radar Chart', href: '/dashboard/radar-chart', icon: Radar },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chartsOpen, setChartsOpen] = useState(false);

  // Check if any chart route is active
  const isChartRouteActive = chartNavigation.some(item => pathname === item.href);

  return (
    <>
      <div className="lg:hidden">
        <button
          type="button"
          className="fixed top-20 left-4 z-40 inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
          onClick={() => setSidebarOpen(true)}
        >
          <span className="sr-only">Open sidebar</span>
          <Bars3Icon className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>

      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 flex lg:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`}>
        <div 
          className={`fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity duration-300 ease-linear ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`} 
          onClick={() => setSidebarOpen(false)}
        />

        <div className={`relative flex w-full max-w-xs flex-1 flex-col bg-white pt-5 pb-4 transition duration-300 ease-in-out transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-only">Close sidebar</span>
              <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </button>
          </div>

          <div className="flex flex-shrink-0 items-center px-4">
            <span className="text-2xl font-bold text-indigo-600"></span>
          </div>
          <div className="mt-5 h-0 flex-1 overflow-y-auto">
            <nav className="space-y-1 px-2">
              {/* Main Navigation */}
              {mainNavigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                    pathname === item.href
                      ? 'bg-indigo-100 text-indigo-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon
                    className={`mr-4 h-6 w-6 flex-shrink-0 ${
                      pathname === item.href ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              ))}

              {/* Charts Section */}
              <div>
                <button
                  type="button"
                  className={`group flex w-full items-center px-2 py-2 text-base font-medium rounded-md ${
                    isChartRouteActive
                      ? 'bg-indigo-100 text-indigo-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={() => setChartsOpen(!chartsOpen)}
                >
                  <TrendingUp
                    className={`mr-4 h-6 w-6 flex-shrink-0 ${
                      isChartRouteActive ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                    aria-hidden="true"
                  />
                  Charts
                  {chartsOpen ? (
                    <ChevronDownIcon className="ml-auto h-5 w-5" />
                  ) : (
                    <ChevronRightIcon className="ml-auto h-5 w-5" />
                  )}
                </button>

                {/* Chart Submenu */}
                {chartsOpen && (
                  <div className="mt-1 space-y-1">
                    {chartNavigation.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`group flex items-center pl-8 pr-2 py-2 text-sm font-medium rounded-md ${
                          pathname === item.href
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                        }`}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <item.icon
                          className={`mr-3 h-5 w-5 flex-shrink-0 ${
                            pathname === item.href ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'
                          }`}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:flex lg:w-64 lg:flex-col" style={{ top: '64px', bottom: 0 }}>
        <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white">
          <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
            <div className="flex flex-shrink-0 items-center px-4">
              <span className="text-2xl font-bold text-indigo-600"></span>
            </div>
            <nav className="mt-5 flex-1 space-y-1 bg-white px-2">
              {/* Main Navigation */}
              {mainNavigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    pathname === item.href
                      ? 'bg-indigo-100 text-indigo-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-6 w-6 flex-shrink-0 ${
                      pathname === item.href ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              ))}

              {/* Charts Section */}
              <div>
                <button
                  type="button"
                  className={`group flex w-full items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isChartRouteActive
                      ? 'bg-indigo-100 text-indigo-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={() => setChartsOpen(!chartsOpen)}
                >
                  <TrendingUp
                    className={`mr-3 h-6 w-6 flex-shrink-0 ${
                      isChartRouteActive ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                    aria-hidden="true"
                  />
                  Charts
                  {chartsOpen ? (
                    <ChevronDownIcon className="ml-auto h-4 w-4" />
                  ) : (
                    <ChevronRightIcon className="ml-auto h-4 w-4" />
                  )}
                </button>

                {/* Chart Submenu */}
                {chartsOpen && (
                  <div className="mt-1 space-y-1">
                    {chartNavigation.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`group flex items-center pl-8 pr-2 py-2 text-sm font-medium rounded-md ${
                          pathname === item.href
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                        }`}
                      >
                        <item.icon
                          className={`mr-3 h-5 w-5 flex-shrink-0 ${
                            pathname === item.href ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'
                          }`}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </nav>
          </div>
        </div>
      </div>
    </>
  );
}