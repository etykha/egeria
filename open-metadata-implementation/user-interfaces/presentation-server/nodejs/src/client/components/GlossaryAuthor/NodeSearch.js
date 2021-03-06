/* SPDX-License-Identifier: Apache-2.0 */
/* Copyright Contributors to the ODPi Egeria project. */
import React, { useState, useEffect, useContext } from "react";
import { GlossaryAuthorContext } from "../../contexts/GlossaryAuthorContext";
import useDebounce from "./useDebounce";
import NodeUpdate from "./NodeUpdate";
// import Delete16 from "../../images/Egeria_delete_16";
// import Edit16 from "../../images/Egeria_edit_16";
import {
  Accordion,
  AccordionItem,
  Button,
  DataTable,
  MultiSelect,
  Pagination,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableSelectAll,
  TableSelectRow,
  TableCell,
  TableHeader,
  TableBody,
  TableToolbar,
  TableToolbarContent,
  TableBatchActions,
  TableBatchAction,
  TableToolbarSearch,
} from "carbon-components-react";

// Responsible for issuing search requests on a node and displaying the results.
// - the search is issue with debounce
// - additional columns can be specified.
// - the search has pagination
// - the search results can be selected. When one or moe are selected - then the delete button is shown allowing, so a multiple delete can be issued.
// @param {*} props
//
const NodeSearch = (props) => {
  console.log("NodeSearch");
  const glossaryAuthorContext = useContext(GlossaryAuthorContext);

  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [errorMsg, setErrorMsg] = useState();
  const [paginationOptions, setPaginationOptions] = useState();
  // properties that will be displayed be default for a node
  const mainProperties = [
    {
      key: "name",
      text: "Name",
    },
    {
      key: "description",
      text: "Description",
    },
    {
      key: "qualifiedName",
      text: "Qualified Name",
    },
  ];
  const [mutationRow, setMutationRow] = useState();
  // State and setter for search term
  const [searchCriteria, setSearchCriteria] = useState("");
  // State and setter for search results
  const [results, setResults] = useState([]);

  // State for search status (whether there is a pending API request)
  const [isSearching, setIsSearching] = useState(false);
  // const [refresh, setRefresh] = useState(false);
  // Now we call our hook, passing in the current searchCriteria value.
  // The hook will only return the latest value (what we passed in) ...
  // ... if it's been more than 500ms since it was last called.
  // Otherwise, it will return the previous value of searchCriteria.
  // The goal is to only have the API call fire when user stops typing ...
  // ... so that we aren't hitting our API rapidly.
  const debouncedSearchCriteria = useDebounce(searchCriteria, 500);

  // let refresh = false;
  // Here's where the API call happens
  // We use useEffect since this is an asynchronous action
  useEffect(
    () => {
      // Make sure we have a value (user has entered something in input)

      if (debouncedSearchCriteria) {
        // Set isSearching state
        setIsSearching(true);
        // Fire off our API call
        issueSearch(debouncedSearchCriteria).then((results) => {
          // Set back to false since request finished
          setIsSearching(false);
          // Set results state
          setResults(results);
        });
      } else {
        setResults([]);
      }
    },
    // This is the useEffect input array
    // Our useEffect function will only execute if this value changes ...
    // ... and thanks to our hook it will only change if the original ...
    // value (searchCriteria) hasn't changed for more than 500ms.
    [debouncedSearchCriteria]
  );

  const paginationProps = () => ({
    disabled: false,
    page: pageNumber,
    pagesUnknown: true,
    pageInputDisabled: false,
    backwardText: "Previous page",
    forwardText: "Next page",
    totalItems: total,
    pageSize: pageSize,
    pageSizes: [5, 10, 50, 100],
    itemsPerPageText: "Items per page:",
    onChange: onPaginationChange,
  });
  // driven when pagination options have changed - page size or page number
  const onPaginationChange = (options) => {
    console.log("onPaginationChange");
    console.log(options);
    // save the pagination options in state
    setPaginationOptions(options);
    refreshSearchResults(options.page, options.pageSize);
  };
  const [headerData, setHeaderData] = useState(mainProperties);
  const additionalProperties = calculateAdditionalProperties();
  let selectedAdditionalProperties = [];

  // calculate the results table header - this will be the default columns plus any additional coliumns the user has specified
  function calculateHeaderData() {
    let allProperties = mainProperties;
    if (
      selectedAdditionalProperties !== undefined &&
      selectedAdditionalProperties &&
      selectedAdditionalProperties.length > 0
    ) {
      console.log("selectedAdditionalProperties.selectedItems 1");
      console.log(selectedAdditionalProperties);
      allProperties = mainProperties.concat(selectedAdditionalProperties);
    }
    console.log("allProperties 1");
    console.log(allProperties);
    setHeaderData(allProperties);
  }
  // refresh the displayed search results
  // this involves taking the results from state and calculating what we need to display pased on the pagination options
  // current page is the subset of results that are displayed.
  function refreshSearchResults(passedPage, passedPageSize) {
    if (results && results.length > 0) {
      // there seems to be an issue when paginationOptions in the pagination handler
      // then calling this function, the first time paginationOptions is undefined.
      // A circumvention is to pass the page and page size as parameters and use them if they are set.
      let pageSize;
      let page;
      if (passedPage) {
        page = passedPage;
      } else {
        page = paginationOptions.page;
      }
      if (passedPageSize) {
        pageSize = passedPageSize;
      } else {
        pageSize = paginationOptions.pageSize;
      }

      // if page = 1 and pageSize 10, currentPageStart = 1
      // if page = 2 and pageSize 10, currentPageStart = 11
      // if page = 2 and pageSize 10 and results.length = 15, currentPageStart = 11 , currentPageSize = 5
      const currentPageStart = (page - 1) * pageSize;
      let currentPageSize = pageSize;
      // if the last page is not complete ensure that we only specify up the end of the what is actually there in the results.
      if (currentPageStart + currentPageSize - 1 > results.length) {
        currentPageSize = results.length - currentPageStart;
      }
      const resultsToshow = results.slice(
        currentPageStart,
        currentPageStart + currentPageSize
      );
      console.log("resultsToshow");
      console.log(resultsToshow);
      setCurrentPage(resultsToshow);
    } else {
      setCurrentPage([]);
    }
  }
  // Additonal attributes can be selected so more columns can be shown
  // the additional attriniutes are in selectedAdditionalProperties
  const onAdditionalAttributesChanged = (items) => {
    console.log("onAdditionalAttributesChanged");
    console.log(items.selectedItems);
    selectedAdditionalProperties = [];
    const selectedItems = items.selectedItems;
    for (let i = 0; i < selectedItems.length; i++) {
      let item = {};
      item.key = selectedItems[i].id;
      item.text = selectedItems[i].text;
      selectedAdditionalProperties.push(item);
    }
    // render the table by recalculating the header state based on the new values
    calculateHeaderData();
  };
  // calculate the columns from the main attributes and the additional attributes.
  function calculateAdditionalProperties() {
    let items = [];
    glossaryAuthorContext.currentNodeType.attributes.map(function (attribute) {
      if (
        attribute.key != "name" &&
        attribute.key != "qualifiedName" &&
        attribute.key != "description"
      ) {
        let item = {};
        item.id = attribute.key;
        item.text = attribute.label;
        items.push(item);
      }
    });
    return items;
  }
  // TODO may not use this
  const handleAdd = (e) => {
    console.log("handleAdd" + e);
  };
  const handleDelete = (selectedRows) => {
    console.log("handleDelete" + selectedRows);
    for (let i = 0; i < selectedRows.length; i++) {
      issueDelete(selectedRows[i]);
    }
  };
  const handleEdit = (selectedRows) => {
    console.log("handleEdit" + selectedRows);
    if (selectedRows.length == 0) {
      alert("Please select something to edit.");
    } else if (selectedRows.length == 1) {
      setMutationRow(selectedRows[0].id);
    } else {
      alert("Please select only one row to edit.");
    }
  };
  // issue the delete rest call for particular row
  function issueDelete(selectedRow) {
    const guid = selectedRow.id;
    const url = glossaryAuthorContext.currentNodeType.url + "/" + guid;
    console.log("issueDelete " + url);
    let msg = "";
    fetch(url, {
      method: "delete",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((res) => {
        console.log("delete completed " + JSON.stringify(res));
        if (res.relatedHTTPCode == 200 && res.result) {
          console.log("Delete successful for guid " + guid);
        } else {
          // if this is a formatted Egeria response, we have a user action
          if (res.relatedHTTPCode) {
            if (res.exceptionUserAction) {
              msg = "Delete Failed: " + res.exceptionUserAction;
            } else {
              msg =
                "Delete Failed unexpected Egeria response: " +
                JSON.stringify(res);
            }
          } else if (res.errno) {
            if (res.errno == "ECONNREFUSED") {
              msg = "Connection refused to the view server.";
            } else {
              // TODO create nice messages for all the http codes we think are relevant
              msg = "Delete Failed with http errno " + res.errno;
            }
          } else {
            msg = "Delete Failed - unexpected response" + JSON.stringify(res);
          }
          setErrorMsg(errorMsg + ",\n" + msg);
          document.getElementById("nodeCreateButton").classList.add("shaker");
        }
        // re issue the search to refresh the results table to account for any deletes.
        issueSearch(debouncedSearchCriteria).then((results) => {
          // Set back to false since request finished
          setIsSearching(false);
          // Set results state
          setResults(results);
        });
      })
      .catch((res) => {
        msg = "Delete Failed - logic error " + JSON.stringify(res);
        setErrorMsg(errorMsg + ",\n" + msg);
      });
  }
  // issue search using a criteria
  function issueSearch(criteria) {
    setPageNumber(1);
    setTotal(0);

    // encode the URI. Be aware the more recent RFC3986 for URLs makes use of square brackets which are reserved (for IPv6)
    const fetchUrl = encodeURI(
      glossaryAuthorContext.currentNodeType.url +
        "?offset=0&pageSize=1000&searchCriteria=" +
        criteria
    );
    return fetch(fetchUrl, {
      method: "get",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.relatedHTTPCode == 200 && res.result) {
          const nodesArray = res.result;
          // if there is a node response then we have successfully updated a node
          if (nodesArray) {
            if (nodesArray.length > 0) {
              let nodeRows = nodesArray.map(function (node) {
                let row = {};
                for (const property in node) {
                  console.log("result property is ", property);
                  if (property == "glossary") {
                    const glossary = node[property];
                    row.glossaryName = glossary.name;
                    row.glossaryGuid = glossary.guid;
                  } else if (property == "systemAttributes") {
                    row.guid = node[property].guid;
                    row.id = node[property].guid;
                  } else {
                    row[property] = node[property];
                  }
                }
                return row;
              });
              //setResults(nodeRows);
              setCurrentPage(nodeRows.slice(0, pageSize));
              setTotal(nodeRows.length);
              return nodeRows;
            } else {
              // no results
              // setResults([]);
              setCurrentPage([]);
              setTotal(0);
              return [];
            }
          } else if (res.relatedHTTPCode) {
            if (res.exceptionUserAction) {
              msg = "Search Failed: " + res.exceptionUserAction;
            } else {
              msg =
                "search Failed unexpected Egeria response: " +
                JSON.stringify(res);
            }
          } else if (res.errno) {
            if (res.errno == "ECONNREFUSED") {
              msg = "Connection refused to the view server.";
            } else {
              // TODO create nice messages for all the http codes we think are relevant
              msg = "Search Failed with http errno " + res.errno;
            }
          } else {
            msg = "Search Failed - unexpected response" + JSON.stringify(res);
          }
          setErrorMsg(msg);
          // no results
          setResults([]);
          setCurrentPage([]);
          setTotal(0);
        }
      })
      .catch((res) => {
        setErrorMsg("Search Failed" + JSON.stringify(res));
      });
  }
  return (
    <div className="top-search-container">
      <div className="top-search-item">
        <div className="search-container">
          {glossaryAuthorContext.currentNodeType &&
            glossaryAuthorContext.currentNodeType.attributes.length > 3 && (
              <div className="search-item">
                <Accordion>
                  <AccordionItem title="Show additional properties">
                    <div class="bx--form-item">
                      <div style={{ width: 150 }}>
                        <MultiSelect
                          onChange={onAdditionalAttributesChanged}
                          items={additionalProperties}
                          itemToString={(item) => (item ? item.text : "")}
                        />
                      </div>
                    </div>
                  </AccordionItem>
                </Accordion>
              </div>
            )}
          <div data-search role="search" class="bx--search bx--search--l">
            <div className="search-item">
              <label
                id="search-input-label-1"
                class="bx--label"
                for="search__input-1"
              >
                Search
              </label>
              <input
                class="bx--search-input"
                type="text"
                id="search__input-1"
                onChange={(e) => setSearchCriteria(e.target.value)}
                placeholder="Search"
              />
              <svg
                focusable="false"
                preserveAspectRatio="xMidYMid meet"
                xmlns="http://www.w3.org/2000/svg"
                class="bx--search-magnifier"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                aria-hidden="true"
              >
                <path d="M15,14.3L10.7,10c1.9-2.3,1.6-5.8-0.7-7.7S4.2,0.7,2.3,3S0.7,8.8,3,10.7c2,1.7,5,1.7,7,0l4.3,4.3L15,14.3z M2,6.5  C2,4,4,2,6.5,2S11,4,11,6.5S9,11,6.5,11S2,9,2,6.5z"></path>
              </svg>
              <button
                class="bx--search-close bx--search-close--hidden"
                title="Clear search
            input"
                aria-label="Clear search input"
              >
                <svg
                  focusable="false"
                  preserveAspectRatio="xMidYMid meet"
                  xmlns="http://www.w3.org/2000/svg"
                  class="bx--search-clear"
                  width="20"
                  height="20"
                  viewBox="0 0 32 32"
                  aria-hidden="true"
                >
                  <path d="M24 9.4L22.6 8 16 14.6 9.4 8 8 9.4 14.6 16 8 22.6 9.4 24 16 17.4 22.6 24 24 22.6 17.4 16 24 9.4z"></path>
                </svg>
              </button>
            </div>
          </div>
          {isSearching && <div className="search-item">Searching ...</div>}
          <div className="search-item">
            <DataTable
              isSortable
              rows={currentPage}
              headers={headerData}
              render={({
                rows,
                headers,
                getHeaderProps,
                getSelectionProps,
                getRowProps,
                getBatchActionProps,
                onInputChange,
                selectedRows,
              }) => (
                <TableContainer
                  title={glossaryAuthorContext.currentNodeType.typeName}
                >
                  <TableToolbar>
                    {/* make sure to apply getBatchActionProps so that the bar renders */}
                    <TableBatchActions {...getBatchActionProps()}>
                      {/* inside of you batch actions, you can include selectedRows */}
                      <TableBatchAction
                        primaryFocus
                        onClick={() => handleDelete(selectedRows)}
                      >
                        Delete
                      </TableBatchAction>

                      <TableBatchAction
                        onClick={() => handleEdit(selectedRows)}
                      >
                        Edit
                      </TableBatchAction>
                    </TableBatchActions>
                    <TableToolbarSearch onChange={onInputChange} />
                    <TableToolbarContent>
                      <Button onClick={handleAdd} small kind="primary">
                        Add new
                      </Button>
                    </TableToolbarContent>
                  </TableToolbar>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableSelectAll {...getSelectionProps()} />
                        {headers.map((header) => (
                          <TableHeader {...getHeaderProps({ header })}>
                            {header.text}
                          </TableHeader>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow {...getRowProps({ row })}>
                          <TableSelectRow {...getSelectionProps({ row })} />
                          {row.cells.map((cell) => (
                            <TableCell key={cell.id}>{cell.value}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            />
          </div>
          <div className="search-item">
            <Pagination {...paginationProps()} />
          </div>
        </div>
      </div>
      {mutationRow && <div className="top-search-item">{NodeUpdate}</div>}
    </div>
  );
};

export default NodeSearch;
