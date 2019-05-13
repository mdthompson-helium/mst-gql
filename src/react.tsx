import * as React from "react"
import { useState, useContext, useRef, useCallback } from "react"
import { observer } from "mobx-react"

import { Query } from "./Query"
import { MSTGQLStore } from "./MSTGQLStore"

// TODO: move to seperate package

export type QueryLike<STORE, DATA> =
  | ((store: STORE) => Query<DATA>)
  | Query<DATA>
  | string // TODO: add gql-tag

export type QueryProps<STORE, DATA> = {
  query?: QueryLike<STORE, DATA> // TODO: or gql-tag
  variables?: any
  children: (args: {
    store: STORE
    loading: boolean
    error: any
    data: DATA | undefined
    prevData: DATA | undefined // set of previously fetched values, in case the query was replaced
    query: Query<DATA> | undefined
    setQuery: (query: QueryLike<STORE, DATA>) => void
  }) => React.ReactElement
}

export function createStoreContext<STORE extends typeof MSTGQLStore.Type>() {
  return React.createContext<STORE>(null as any)
}

function normalizeQuery<STORE extends typeof MSTGQLStore.Type, DATA>(
  store: STORE,
  variables: any,
  query: QueryLike<STORE, DATA>
): Query<DATA> {
  if (typeof query === "function") return query(store)
  if (typeof query === "string") return store.query(query, variables)
  // TODO: support gql-tag
  return query
}

export function createQueryComponent<STORE extends typeof MSTGQLStore.Type>(
  context: React.Context<STORE>
) {
  return observer(function Query<DATA = any>(props: QueryProps<STORE, DATA>) {
    const store = useContext(context)
    const prevData = useRef<DATA>()
    const [query, setQuery] = useState<Query<DATA> | undefined>(() => {
      if (!props.query) return undefined
      return normalizeQuery<STORE, DATA>(store, props.variables, props.query)
    })

    const setQueryHelper = useCallback((newQuery: QueryLike<STORE, DATA>) => {
      // if the current query had results already, save it in prevData
      if (query && query.data) prevData.current = query.data
      setQuery(normalizeQuery(store, props.variables, newQuery))
    }, [])

    // if new query or variables are passed in, replace the query!
    React.useEffect(() => {
      if (!props.query || typeof props.query === "function") return // ignore changes to initializer func
      setQueryHelper(props.query)
    }, [props.query, props.variables]) // TODO: props.variables should be checked on shallow-equality!

    return props.children({
      store,
      loading: query ? query.fetching : false,
      error: query && query.error,
      data: query && query.data,
      prevData: prevData.current,
      query,
      setQuery: setQueryHelper
    })
  })
}
