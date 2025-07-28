import { createBrowserRouter } from 'react-router-dom';
import Login from './pages/Login';
import CargaList from './pages/Carga';
//import PalletsList from './pages/Pallets';
//import ItensList from './pages/Itens';

function handleCargaSelected(carga: any) {
  console.log('Carga selecionada:', carga);
}

function handlePalletSelected(pallet: any) {
  console.log('Pallet selecionado:', pallet);
}

function handleItemSelected(item: any) {
  console.log('Item selecionado:', item);
}

const routerApp = createBrowserRouter([
  {
    path: '/',
    element: <Login />,
  },
  {
    path: '/Carga',
    element: <CargaList onSelectCarga={handleCargaSelected} />,
  },
  {
    path: '/Pallets',
    //element: <PalletsList onSelectPallet={handlePalletSelected} />,
  },
  {
    path: '/Itens',
    //element: <ItensList onSelectItem={handleItemSelected} />,
  },
]);

export default routerApp;
