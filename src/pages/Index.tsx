
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// This component is now deprecated and serves only as a redirector
// specific logic has been moved to src/routes/* and src/layouts/*
const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/workspace/training', { replace: true });
  }, [navigate]);

  return null;
};

export default Index;
