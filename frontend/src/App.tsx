import {BrowserRouter, Link, Route, Routes} from 'react-router-dom';
import {Home} from './pages/Home';
import {Settings} from './pages/Settings';
import {Analytics} from './pages/Analytics';

function App() {
    return (
        <BrowserRouter>
            <div className="min-h-screen bg-gray-50">
                <nav className="bg-white shadow">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="flex justify-between h-16">
                            <div className="flex space-x-8">
                                <Link
                                    to="/"
                                    className="inline-flex items-center px-1 pt-1 text-gray-900 hover:text-blue-600"
                                >
                                    Главная
                                </Link>
                                <Link
                                    to="/analytics"
                                    className="inline-flex items-center px-1 pt-1 text-gray-900 hover:text-blue-600"
                                >
                                    Аналитика
                                </Link>
                                <Link
                                    to="/settings"
                                    className="inline-flex items-center px-1 pt-1 text-gray-900 hover:text-blue-600"
                                >
                                    Настройки
                                </Link>
                            </div>
                        </div>
                    </div>
                </nav>

                <main>
                    <Routes>
                        <Route path="/" element={<Home/>}/>
                        <Route path="/analytics" element={<Analytics/>}/>
                        <Route path="/settings" element={<Settings/>}/>
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    );
}

export default App;
