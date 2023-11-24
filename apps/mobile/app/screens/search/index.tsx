/*
This file is part of the Notesnook project (https://notesnook.com/)

Copyright (C) 2023 Streetwriters (Private) Limited

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

import { Item, VirtualizedGrouping } from "@notesnook/core";
import React, { useState } from "react";
import DelayLayout from "../../components/delay-layout";
import List from "../../components/list";
import { NavigationProps } from "../../services/navigation";
import { SearchBar } from "./search-bar";
import { db } from "../../common/database";
export const Search = ({ route }: NavigationProps<"Search">) => {
  const [results, setResults] = useState<VirtualizedGrouping<Item>>();
  const [loading, setLoading] = useState(false);
  const [searchStatus, setSearchStatus] = useState<string>();

  const onSearch = async (query: string) => {
    if (!query) {
      setResults(undefined);
      setLoading(false);
      setSearchStatus(undefined);
      return;
    }
    try {
      setLoading(true);
      const type =
        route.params.type === "trash"
          ? "trash"
          : ((route.params?.type + "s") as keyof typeof db.lookup);
      console.log(
        `Searching in ${type} for ${query}`,
        route.params?.ids?.length
      );
      const results = await db.lookup[type](
        query,
        route.params?.type === "note" ? route.params?.ids : undefined
      );
      console.log(`Found ${results.ids?.length} results for ${query}`);
      setResults(results);
      if (results.ids?.length === 0) {
        setSearchStatus(`No results found for ${query}`);
      } else {
        setSearchStatus(undefined);
      }
      setLoading(false);
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <>
      <SearchBar onChangeText={onSearch} loading={loading} />
      <List
        data={results}
        dataType={route.params?.type}
        renderedInRoute={route.name}
        loading={false}
        placeholder={{
          title: route.name,
          paragraph:
            searchStatus ||
            `Type a keyword to search in ${route.params?.title}`,
          loading: "Searching..."
        }}
      />
    </>
  );
};