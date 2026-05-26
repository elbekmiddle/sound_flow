import { useContext } from 'react';
import { LangContext } from '../contexts/LangContext.jsx';

export default function useT() {
  const { t } = useContext(LangContext);
  return t;
}
