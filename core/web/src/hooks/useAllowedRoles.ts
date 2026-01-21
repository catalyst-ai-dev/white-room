import type { UserRole } from '@namespace/shared';
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createLogger } from '@namespace/logger';
import useCurrentUser from '@web/hooks/useCurrentUser';

const logger = createLogger('useAllowedRoles');

interface UseAllowedRolesProps {
  roles: UserRole[];
  redirectUrl?: string;
  addRedirectQueryParam?: boolean;
}

export default function useAllowedRoles({
  roles,
  redirectUrl = '/login',
  addRedirectQueryParam,
}: UseAllowedRolesProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading } = useCurrentUser();

  useEffect(() => {
    if (isLoading) {
      return;
    }
    const isAllowed = roles.some((role) => user?.roles?.includes(role));
    if (!isAllowed) {
      if (user) {
        logger.info(
          `Current user roles "${user.roles?.join(', ') ?? ''}" not allowed, redirecting to ${redirectUrl}`,
        );
      } else {
        logger.info(`User not logged in, redirecting to ${redirectUrl}`);
      }

      const redirectToWithQuery = addRedirectQueryParam
        ? `${redirectUrl}?next=${encodeURIComponent(location.pathname)}`
        : redirectUrl;

      navigate(redirectToWithQuery);
    }
  }, [user, isLoading, roles, redirectUrl, addRedirectQueryParam, navigate, location.pathname]);
}
