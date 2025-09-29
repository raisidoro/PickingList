import { createBrowserRouter } from 'react-router-dom';
import Login from './pages/Login';
import CargaList from './pages/Carga';
import PalletList from './pages/Pallets';
import PalletListView from './pages/PalletsView';

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
  {
    path: '/PalletsView',
    element: <PalletListView />,
  },
]);

export default routerApp;
