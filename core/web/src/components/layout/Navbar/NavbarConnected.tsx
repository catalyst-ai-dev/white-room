import { UserRole } from '@namespace/shared';
import useCurrentUser from '@web/hooks/useCurrentUser';
import Navbar from './Navbar';

const anonymousMenu = [
  {
    title: 'Log In',
    path: '/login',
  },
];

const loggedInMenu = [
  {
    title: 'Log Out',
    path: '/logout',
    danger: true,
  },
];

const adminMenu = [
  {
    title: 'Admin',
    path: `/admin/users`,
  },
  {
    title: '',
    path: '',
    divider: true,
  },
  ...loggedInMenu,
];

const NavbarConnected = () => {
  const { user } = useCurrentUser();
  const logoUrl = '/images/logo.svg';

  const dropdownMenu = !user
    ? anonymousMenu
    : user.roles?.includes(UserRole.Admin)
      ? adminMenu
      : loggedInMenu;
  return (
    <div className="bg-white [box-shadow:0px_4px_10px_0px_#0000000D]">
      <Navbar
        logoUrl={logoUrl}
        logoLinkTo="/"
        avatarImageUrl={user?.profilePictureUrl as string}
        userName={user ? `${user.firstName} ${user.lastName}` : null}
        userEmail={user?.email}
        dropdownMenu={dropdownMenu}
      />
    </div>
  );
};

export default NavbarConnected;
