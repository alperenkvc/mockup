import React from 'react'
import SignUp from './pages/Auth/SignUp.jsx'
import Login from './pages/Auth/Login.jsx'
import Home from './pages/Content/Home.jsx'
import Popular from './pages/Content/Popular.jsx'
import ManageCommunities from './pages/Content/ManageCommunities.jsx'
import TopCommunities from './pages/Content/TopCommunities.jsx'
import HomeLayout from './components/layouts/HomeLayout.jsx'
import CreatePost from './pages/Content/CreatePost.jsx'
import UserProfile from './pages/Content/UserProfile.jsx'
import Achievements from './pages/Content/Achievements.jsx'
import Community from './pages/Content/Community.jsx'
import PostDetail from './pages/Content/PostDetail.jsx'
import CustomFeed from './pages/Content/CustomFeed.jsx'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet
} from "react-router-dom";

// Layout wrapper component - keeps Navbar, SideMenu, and HomeLayout mounted across all routes
const LayoutWrapper = () => {
  return (
    <HomeLayout>
      <Outlet /> {/* This renders the matched child route */}
    </HomeLayout>
  );
};

const App = () => {
  return (
    <div>
      <Router>
        <Routes>
          {/* All routes wrapped in LayoutWrapper - layout stays mounted */}
          <Route element={<LayoutWrapper />}>
            <Route path="/" element={<Home />} />
            <Route path="/popular" element={<Popular />} />
            <Route path='/signup' element={<SignUp />} />
            <Route path='/login' element={<Login />} />
            <Route path='/manage-communities' element={<ManageCommunities />} />
            <Route path='/submit' element={<CreatePost />} />
            <Route path='/user/:username' element={<UserProfile />} />
            <Route path='/r/:communityName' element={<Community />} />
            <Route path='/post/:postId' element={<PostDetail />} />
            <Route path='/feed/:feedId' element={<CustomFeed />} />
            <Route path='/top-communities' element={<TopCommunities />} />
            <Route path='/achievements' element={<Achievements/>}/>
          </Route>
        </Routes>
      </Router>
    </div>
  )
}

export default App
