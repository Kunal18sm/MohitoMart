import { Navigate } from 'react-router-dom';

const getStoredProfile = () => {
    try {
        return JSON.parse(localStorage.getItem('userProfile') || '{}');
    } catch (error) {
        return {};
    }
};

const getRedirectPathByRole = (role) => {
    if (role === 'admin') {
        return '/admin';
    }

    if (role === 'shop_owner') {
        return '/owner/shop';
    }

    return '/';
};

const RouteGuard = ({ children, requireAuth = false, guestOnly = false, allowRoles = [] }) => {
    const hasSession = Boolean(localStorage.getItem('authToken'));
    const profile = getStoredProfile();
    const role = String(profile?.role || 'user');

    if (guestOnly && hasSession) {
        return <Navigate to={getRedirectPathByRole(role)} replace />;
    }

    if (requireAuth && !hasSession) {
        return <Navigate to="/auth" replace />;
    }

    if (requireAuth && allowRoles.length > 0 && !allowRoles.includes(role)) {
        return <Navigate to={getRedirectPathByRole(role)} replace />;
    }

    return children;
};

export default RouteGuard;
