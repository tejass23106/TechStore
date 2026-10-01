import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Chatbot from "../components/Chatbot";

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-white text-gray-900">

      <Navbar />

      <Outlet />

      <Footer />

      <Chatbot />

    </div>
  );
}

