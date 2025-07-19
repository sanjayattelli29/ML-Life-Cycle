'use client';

import { useState, useEffect, useRef } from 'react';

import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { 
  UserCircleIcon, 
  ChevronDownIcon, 
  ArrowRightOnRectangleIcon,
  ChartBarIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileImage, setProfileImage] = useState('');
  const [userName, setUserName] = useState('');
  const dropdownRef = useRef(null);
  const router = useRouter();


  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      setProfileImage(session.user.image || '');
      setUserName(session.user.name || session.user.email?.split('@')[0] || 'User');
      
      // Try to fetch user profile for custom image if available
      fetchUserProfile();
    }
  }, [status, session]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

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
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-40">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8" aria-label="Global">
        {/* Logo */}
        <div className="flex lg:flex-1">
          <Link href="/dashboard" className="-m-1.5 p-1.5 flex items-center space-x-3 group">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300 ease-out">
              <ChartBarIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 bg-clip-text text-transparent">
              DataViz
            </span>
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex lg:hidden">
           <button
      type="button"
      className="-m-2.5 inline-flex items-center justify-center rounded-xl p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all duration-200"
      onClick={() => router.push('/profile')}
    >
      <span className="sr-only">Open main menu</span>
      <Bars3Icon className="h-6 w-6" />
    </button>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex lg:gap-x-1">
          <Link href="/features" className="relative px-4 py-2 text-sm font-medium text-slate-700 hover:text-indigo-700 transition-all duration-200 rounded-lg hover:bg-slate-50/80 group">
            <span className="relative z-10"></span>
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          </Link>
          <Link href="/pricing" className="relative px-4 py-2 text-sm font-medium text-slate-700 hover:text-indigo-700 transition-all duration-200 rounded-lg hover:bg-slate-50/80 group">
            <span className="relative z-10"></span>
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          </Link>
          <Link href="/about" className="relative px-4 py-2 text-sm font-medium text-slate-700 hover:text-indigo-700 transition-all duration-200 rounded-lg hover:bg-slate-50/80 group">
            <span className="relative z-10"></span>
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          </Link>
        </div>

        {/* Right Section */}
        <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:items-center lg:space-x-4">
          {session ? (
            <>
              {/* Dashboard Link */}
              <Link 
                href="/dashboard" 
                className="relative px-4 py-2 text-sm font-semibold text-indigo-700 hover:text-indigo-800 transition-all duration-200 rounded-lg hover:bg-indigo-50/80 group"
              >
                <span className="relative z-10">Dashboard</span>
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-indigo-50 to-indigo-100 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              </Link>

              {/* User Avatar Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  className="flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-slate-50/80 transition-all duration-200 border border-slate-200/60 hover:border-slate-300/80 hover:shadow-sm"
                  onClick={toggleDropdown}
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
                >
                  {/* Profile Image */}
                  <div className="relative">
                    {profileImage ? (
                      <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-indigo-100/80">
                        <Image
                          src={profileImage}
                          alt={userName}
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center">
                        <UserCircleIcon className="w-5 h-5 text-white" />
                      </div>
                    )}
                    {/* Online indicator */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full shadow-sm"></div>
                  </div>

                  {/* User Info */}
                  <div className="text-left hidden sm:block">
                    <div className="text-sm font-medium text-slate-900">{userName}</div>
                    <div className="text-xs text-slate-500 font-medium">Online</div>
                  </div>

                  {/* Dropdown Arrow */}
                  <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-3 w-72 bg-white rounded-2xl border border-slate-200/60 backdrop-blur-xl z-50 overflow-hidden shadow-xl">
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-xl"></div>
                    
                    {/* User Info Header */}
                    <div className="relative px-5 py-4 border-b border-slate-100/80">
                      <div className="flex items-center space-x-4">
                        {profileImage ? (
                          <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-slate-100">
                            <Image
                              src={profileImage}
                              alt={userName}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center">
                            <UserCircleIcon className="w-7 h-7 text-white" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900 truncate">{userName}</div>
                          <div className="text-sm text-slate-500 truncate">{session?.user?.email}</div>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="relative py-2">
                      <Link
                        href="/profile"
                        className="flex items-center px-5 py-3 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50/80 transition-all duration-200"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <UserCircleIcon className="w-4 h-4 mr-3 text-slate-400" />
                        Your Profile
                      </Link>
                    </div>

                    {/* Sign Out */}
                    <div className="relative py-2 border-t border-slate-100/80">
                      <button
                        className="flex w-full items-center px-5 py-3 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50/80 transition-all duration-200"
                        onClick={async () => {
                          await signOut({ redirect: false });
                          window.location.href = '/auth/signin';
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
            <div className="flex items-center gap-3">
              <Link href="/auth/signin" className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors duration-200 rounded-lg hover:bg-slate-50/80">
                Sign in
              </Link>
              <Link
                href="/auth/signup"
                className="relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:from-indigo-700 hover:via-indigo-800 hover:to-purple-800 hover:shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5"
              >
                <span className="relative z-10">Get started</span>
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-200"></div>
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden" role="dialog" aria-modal="true">
          {/* Backdrop with higher z-index */}
          <div className="fixed inset-0 z-[9999] bg-slate-900/30 backdrop-blur-sm"></div>
          
          {/* Mobile menu panel with highest z-index */}
          <div className="fixed inset-y-0 right-0 z-[10000] w-full overflow-y-auto bg-white/95 backdrop-blur-xl px-6 py-6 sm:max-w-sm border-l border-slate-200/60 shadow-2xl">
            <div className="flex items-center justify-between">
              <Link href="/" className="-m-1.5 p-1.5 flex items-center space-x-3" onClick={() => setMobileMenuOpen(false)}>
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 rounded-xl flex items-center justify-center">
                  <ChartBarIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 bg-clip-text text-transparent">
                  DataViz
                </span>
              </Link>
              <button
                type="button"
                className="-m-2.5 rounded-xl p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all duration-200"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">Close menu</span>
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="mt-8 flow-root">
              <div className="-my-6 divide-y divide-slate-200/60">
                <div className="space-y-1 py-6">
                  <Link
                    href="/features"
                    className="-mx-3 block rounded-xl px-4 py-3 text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50/80 transition-all duration-200"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    
                  </Link>
                  <Link
                    href="/pricing"
                    className="-mx-3 block rounded-xl px-4 py-3 text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50/80 transition-all duration-200"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    
                  </Link>
                  <Link
                    href="/about"
                    className="-mx-3 block rounded-xl px-4 py-3 text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50/80 transition-all duration-200"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    
                  </Link>
                </div>
                <div className="py-6">
                  {session ? (
                    <>
                      {/* Mobile Profile Section */}
                      <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 rounded-2xl border border-indigo-100/50">
                        <div className="flex items-center space-x-4">
                          {profileImage ? (
                            <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-white/60">
                              <Image
                                src={profileImage}
                                alt={userName}
                                width={56}
                                height={56}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center">
                              <UserCircleIcon className="w-8 h-8 text-white" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-900 truncate">{userName}</div>
                            <div className="text-sm text-slate-600 truncate">{session?.user?.email}</div>
                          </div>
                        </div>
                      </div>

                      <Link
                        href="/dashboard"
                        className="-mx-3 block rounded-xl px-4 py-3 text-base font-semibold text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50/80 transition-all duration-200"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Dashboard
                      </Link>
                      <Link
                        href="/profile"
                        className="-mx-3 block rounded-xl px-4 py-3 text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50/80 transition-all duration-200"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Profile
                      </Link>
                      <button
                        onClick={async () => {
                          await signOut({ redirect: false });
                          window.location.href = '/auth/signin';
                          setMobileMenuOpen(false);
                        }}
                        className="-mx-3 block rounded-xl px-4 py-3 text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50/80 w-full text-left transition-all duration-200"
                      >
                        Sign out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/auth/signin"
                        className="-mx-3 block rounded-xl px-4 py-3 text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50/80 transition-all duration-200"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Sign in
                      </Link>
                      <Link
                        href="/auth/signup"
                        className="-mx-3 block rounded-xl px-4 py-3 text-base font-semibold text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50/80 transition-all duration-200"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Get started
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}