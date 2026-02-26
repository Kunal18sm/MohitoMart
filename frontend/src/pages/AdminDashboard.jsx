import { useState } from 'react';

const AdminDashboard = () => {
    const [activeMenu, setActiveMenu] = useState('Overview');

    const menuItems = ['Overview', 'Products', 'Orders', 'Users', 'Analytics'];

    return (
        <div className="flex min-h-screen bg-light pt-[72px]">
            {/* Sidebar */}
            <aside className="w-64 bg-dark text-white hidden md:flex flex-col fixed h-full z-40">
                <div className="p-6 border-b border-gray-800">
                    <h2 className="text-2xl font-black text-primary tracking-tighter">ADMIN</h2>
                    <p className="text-sm text-gray-400">Dashboard Panel</p>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    {menuItems.map((item) => (
                        <button
                            key={item}
                            onClick={() => setActiveMenu(item)}
                            className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-colors ${activeMenu === item ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                }`}
                        >
                            {item}
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Main Content (Push right by sidebar width) */}
            <main className="flex-1 md:ml-64 p-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-black text-dark">{activeMenu}</h1>
                    <div className="flex items-center space-x-4">
                        <button className="bg-white p-2 text-dark rounded-full shadow-sm hover:text-primary transition">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /></svg>
                        </button>
                        <div className="h-10 w-10 bg-primary rounded-full border-2 border-white shadow-md"></div>
                    </div>
                </div>

                {activeMenu === 'Overview' && (
                    <div className="animate-fade-in">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
                                <div>
                                    <p className="text-gray-500 font-semibold mb-1">Total Sales</p>
                                    <h3 className="text-3xl font-black text-dark">$84,592</h3>
                                </div>
                                <div className="w-12 h-12 bg-green-50 text-green-500 rounded-full flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
                                <div>
                                    <p className="text-gray-500 font-semibold mb-1">Total Orders</p>
                                    <h3 className="text-3xl font-black text-dark">1,245</h3>
                                </div>
                                <div className="w-12 h-12 bg-blue-50 text-primary rounded-full flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
                                <div>
                                    <p className="text-gray-500 font-semibold mb-1">New Users</p>
                                    <h3 className="text-3xl font-black text-dark">892</h3>
                                </div>
                                <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-full flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
                                </div>
                            </div>
                        </div>

                        {/* Fake Chart Area */}
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 h-96 flex flex-col justify-between">
                            <h3 className="text-xl font-bold text-dark mb-4">Revenue Analytics</h3>
                            <div className="flex-1 flex items-end space-x-2 py-4 border-b border-l border-gray-200">
                                {/* Fake bars */}
                                {[40, 60, 45, 80, 55, 90, 70, 100, 85, 60, 40, 75].map((h, i) => (
                                    <div key={i} className="flex-1 bg-primary/20 hover:bg-primary transition-colors rounded-t-sm" style={{ height: `${h}%` }}></div>
                                ))}
                            </div>
                            <div className="flex justify-between mt-2 text-sm text-gray-400 font-medium">
                                <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminDashboard;
