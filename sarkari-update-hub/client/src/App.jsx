// Apply Know Frontend Application
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LangProvider } from './context/LangContext';
import { AuthProvider } from './context/AuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import CategoryPage from './pages/CategoryPage';
import ImportantDates from './pages/ImportantDates';
import PostDetail from './pages/PostDetail';
import Search from './pages/Search';
import AboutContact from './pages/AboutContact';
import Disclaimer from './pages/Disclaimer';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminAddEditPost from './pages/AdminAddEditPost';

function MainAppLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/jobs" element={<CategoryPage category="Job" />} />
          <Route path="/results" element={<CategoryPage category="Result" />} />
          <Route path="/admit-card" element={<CategoryPage category="Admit Card" />} />
          <Route path="/exam-dates" element={<CategoryPage category="Exam Date" />} />
          <Route path="/admission" element={<CategoryPage category="Admission" />} />
          <Route path="/answer-key" element={<CategoryPage category="Answer Key" />} />
          <Route path="/dates" element={<ImportantDates />} />
          <Route path="/post/:id" element={<PostDetail />} />
          <Route path="/search" element={<Search />} />
          <Route path="/about" element={<AboutContact />} />
          <Route path="/disclaimer" element={<Disclaimer />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/add" element={<AdminAddEditPost />} />
          <Route path="/admin/edit/:id" element={<AdminAddEditPost />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <LangProvider>
      <AuthProvider>
        <Router>
          <MainAppLayout />
        </Router>
      </AuthProvider>
    </LangProvider>
  );
}
