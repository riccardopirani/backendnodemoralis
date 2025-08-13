import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { Shield, User, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const HeaderContainer = styled.header`
  background-color: ${({ theme }) => theme.colors.white};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  position: sticky;
  top: 0;
  z-index: 100;
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing.md} 0;
  max-width: 1200px;
  margin: 0 auto;
  padding-left: ${({ theme }) => theme.spacing.md};
  padding-right: ${({ theme }) => theme.spacing.md};
`;

const Logo = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => theme.colors.primaryDark};
  }
`;

const Nav = styled.nav`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.lg};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    display: none;
  }
`;

const NavLink = styled(Link)`
  color: ${({ theme, $active }) => $active ? theme.colors.primary : theme.colors.text};
  text-decoration: none;
  font-weight: ${({ theme, $active }) => $active ? theme.fontWeights.medium : theme.fontWeights.normal};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  transition: all 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    background-color: ${({ theme }) => theme.colors.surface};
  }
`;

const AuthSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
`;

const AuthButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  transition: all 0.2s ease;
  cursor: pointer;
  border: none;
  outline: none;
  text-decoration: none;

  &.btn-primary {
    background-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.white};

    &:hover {
      background-color: ${({ theme }) => theme.colors.primaryDark};
    }
  }

  &.btn-outline {
    background-color: transparent;
    color: ${({ theme }) => theme.colors.primary};
    border: 2px solid ${({ theme }) => theme.colors.primary};

    &:hover {
      background-color: ${({ theme }) => theme.colors.primary};
      color: ${({ theme }) => theme.colors.white};
    }
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background-color: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const MobileMenuButton = styled.button`
  display: none;
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing.sm};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    display: block;
  }
`;

const MobileMenu = styled.div`
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: ${({ theme }) => theme.colors.white};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.md};
  padding: ${({ theme }) => theme.spacing.md};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    display: ${({ $isOpen }) => $isOpen ? 'block' : 'none'};
  }
`;

const MobileNavLink = styled(Link)`
  display: block;
  padding: ${({ theme }) => theme.spacing.sm} 0;
  color: ${({ theme, $active }) => $active ? theme.colors.primary : theme.colors.text};
  text-decoration: none;
  font-weight: ${({ theme, $active }) => $active ? theme.fontWeights.medium : theme.fontWeights.normal};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const Header = () => {
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <HeaderContainer>
      <HeaderContent>
        <Logo to="/" onClick={closeMobileMenu}>
          <Shield size={24} />
          JetCV
        </Logo>

        <Nav>
          <NavLink to="/" $active={isActive('/')}>
            Home
          </NavLink>
          <NavLink to="/veriff-auth" $active={isActive('/veriff-auth')}>
            Autenticazione
          </NavLink>
          {isAuthenticated && (
            <NavLink to="/dashboard" $active={isActive('/dashboard')}>
              Dashboard
            </NavLink>
          )}
        </Nav>

        <AuthSection>
          {isAuthenticated ? (
            <>
              <UserInfo>
                <User size={16} />
                <span>Verificato</span>
              </UserInfo>
              <AuthButton className="btn-outline" onClick={logout}>
                <LogOut size={16} />
                Logout
              </AuthButton>
            </>
          ) : (
            <AuthButton as={Link} to="/veriff-auth" className="btn-primary">
              <Shield size={16} />
              Verifica Identità
            </AuthButton>
          )}
        </AuthSection>

        <MobileMenuButton onClick={toggleMobileMenu}>
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </MobileMenuButton>
      </HeaderContent>

      <MobileMenu $isOpen={mobileMenuOpen}>
        <MobileNavLink to="/" $active={isActive('/')} onClick={closeMobileMenu}>
          Home
        </MobileNavLink>
        <MobileNavLink to="/veriff-auth" $active={isActive('/veriff-auth')} onClick={closeMobileMenu}>
          Autenticazione
        </MobileNavLink>
        {isAuthenticated && (
          <MobileNavLink to="/dashboard" $active={isActive('/dashboard')} onClick={closeMobileMenu}>
            Dashboard
          </MobileNavLink>
        )}
        {isAuthenticated && (
          <MobileNavLink as="button" onClick={() => { logout(); closeMobileMenu(); }}>
            Logout
          </MobileNavLink>
        )}
      </MobileMenu>
    </HeaderContainer>
  );
};

export default Header;
