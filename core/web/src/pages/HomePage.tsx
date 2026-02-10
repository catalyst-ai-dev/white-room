import { Helmet } from 'react-helmet-async';

import { UserRole } from '@namespace/shared';
import useAllowedRoles from '@web/hooks/useAllowedRoles';

const HomePage = () => {
  useAllowedRoles({
    roles: [UserRole.User],
    redirectUrl: '/login',
  });
  return (
    <>
      <Helmet>\n        <title>WEB_TITLE</title>\n      </Helmet>\n      <h1 className=\"mb-6 mt-4 text-xl font-semibold text-[#132630] sm:text-2xl\">Grass-roots secondary matrix</h1>
    </>
  );
};

export default HomePage;
