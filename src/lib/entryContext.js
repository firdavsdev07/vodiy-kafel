import { createContext, useContext } from 'react'

/** True once the entry gate has lifted, so page intros can wait for it. */
export const EntryContext = createContext(true)

export const useEntered = () => useContext(EntryContext)
