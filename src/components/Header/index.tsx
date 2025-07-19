'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession, signIn, signOut } from 'next-auth/react';
import { 
  UserCircleIcon, 
  ChevronDownIcon, 
  Cog6ToothIcon, 
  ArrowRightOnRectangleIcon,
  ChartBarIcon,
  CloudArrowUpIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline';

export default function Header() {
  const { data: session, status } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileImage, setProfileImage] = useState('');
  const [userName, setUserName] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      setProfileImage(session.user.image || '');
      setUserName(session.user.name || 'User');
      
      // Try to fetch user profile for custom image if available
      fetchUserProfile();
    }
  }, [status, session]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: unknown) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.profile && data.profile.imageUrl) {
          setProfileImage(data.profile.imageUrl);
        }
      }
    } catch (error) {
      console.error('Error fetching profile image:', error);
    }
  };
  
  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 backdrop-blur-md bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo Section */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex-shrink-0 flex items-center group">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <ChartBarIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  DataViz
                </span>
              </div>
            </Link>
            
            {/* Navigation */}
            <nav className="hidden md:ml-8 md:flex md:space-x-1">
              <Link 
                href="/dashboard" 
                className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
              >
                <Squares2X2Icon className="w-4 h-4 mr-2" />
                Dashboard
              </Link>
              <Link 
                href="/dashboard/upload" 
                className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
              >
                <CloudArrowUpIcon className="w-4 h-4 mr-2" />
                Upload Dataset
              </Link>
              <Link 
                href="/dashboard/bar-charts" 
                className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
              >
                <ChartBarIcon className="w-4 h-4 mr-2" />
                Charts
              </Link>
            </nav>
          </div>
          
          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {status === 'authenticated' ? (
              <>
                {/* Profile Button - Always Visible */}
                <Link href="/profile">
                  <button className="flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg">
                    <UserCircleIcon className="w-4 h-4 mr-2" />
                    <span className="font-medium">Profile</span>
                  </button>
                </Link>

                {/* User Avatar Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 border border-gray-200 hover:border-gray-300"
                    onClick={toggleDropdown}
                    aria-expanded={dropdownOpen}
                    aria-haspopup="true"
                  >
                    {/* Profile Image */}
                    <div className="relative">
                      {profileImage ? (
                        <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-indigo-100">
                          <Image
                            src={profileImage}
                            alt={userName}
                            width={32}
                            height={32}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
                          <UserCircleIcon className="w-5 h-5 text-white" />
                        </div>
                      )}
                      {/* Online indicator */}
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                    </div>

                    {/* User Info */}
                    <div className="hidden sm:block text-left">
                      <div className="text-sm font-medium text-gray-900">{userName}</div>
                      <div className="text-xs text-gray-500">Online</div>
                    </div>

                    {/* Dropdown Arrow */}
                    <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 border border-gray-100 z-50">
                      {/* User Info Header */}
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center space-x-3">
                          {profileImage ? (
                            <div className="w-10 h-10 rounded-full overflow-hidden">
                              <Image
                                src={profileImage}
                                alt={userName}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
                              <UserCircleIcon className="w-6 h-6 text-white" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900">{userName}</div>
                            <div className="text-sm text-gray-500">{session?.user?.email}</div>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        <Link
                          href="/profile"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <UserCircleIcon className="w-4 h-4 mr-3 text-gray-400" />
                          Your Profile
                        </Link>
                        <Link
                          href="/settings"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <Cog6ToothIcon className="w-4 h-4 mr-3 text-gray-400" />
                          Settings
                        </Link>
                      </div>

                      {/* Sign Out */}
                      <div className="py-2 border-t border-gray-100">
                        <button
                          className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                          onClick={() => {
                            signOut({ callbackUrl: 'https://dataviz-ai.netlify.app/' });
                            setDropdownOpen(false);
                          }}
                        >
                          <ArrowRightOnRectangleIcon className="w-4 h-4 mr-3" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Sign In Button */
              <button
                onClick={() => signIn()}
                className="flex items-center px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}