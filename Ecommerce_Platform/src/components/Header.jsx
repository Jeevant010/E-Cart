import React from 'react';
import './Header.css';

const Header = () => {
  return (
    <header className="lux-header">
      <div className="lux-header__container">
        <span className="lux-header__logo">E-CART</span>
        <span className="lux-header__greeting"></span>
      </div>
    </header>
  );
};

export default Header;
