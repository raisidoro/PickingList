import { createBrowserRouter } from 'react-router-dom';
import Login from './pages/Login';
import CargaList from './pages/Carga';
import PalletList from './pages/Pallets';

const routerApp = createBrowserRouter([
  {
    path: '/',
    element: <Login />,
  },
  {
    path: '/Carga',
    element: <CargaList />,
  },
  {
    path: '/Pallets',
    element: <PalletList/>,
  },
]);

export default routerApp;
