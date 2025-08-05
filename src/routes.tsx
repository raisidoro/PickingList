import { createBrowserRouter } from 'react-router-dom';
import Login from './pages/Login';
import CargaList from './pages/Carga';
import PalletList from './pages/Pallets';
//import ItensList from './pages/Itens';

//function handleItemSelected(item: any) {
  //console.log('Item selecionado:', item);
//}

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
    element: <PalletList cCarga={''}/>,
  },
  {
    path: '/Itens',
    //element: <ItensList onSelectItem={handleItemSelected} />,
  },
]);

export default routerApp;
