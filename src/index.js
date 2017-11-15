import React from 'react';
import ReactDOM from 'react-dom';

import { Tabs, Tab, TabPanel, TabList } from 'react-web-tabs';
import AnimakitExpander from 'animakit-expander';
import Form from "react-jsonschema-form";
import {Grid, Row, Column} from 'react-cellblock';

var url = "http://10.50.1.2:8080";
var ws_url = "ws://10.50.1.2:8090";
var call_id = 0;
var sock = null;

function gather_params(formbox) {
    return $(formbox).find("input, select").map(function () {
        var data = $(this).val();
        if ($(this).parent().hasClass("field-integer"))
            data = parseInt(data);
        return data;
    }).get();
}

function call_server(formbox, method, extra) {
    call_id++;
    var params = gather_params(formbox);
    if (typeof extra !== 'undefined')
        params.push(extra);
    console.log(method);
    console.log(params);
    var postdata = JSON.stringify({id: call_id, method: method, params: params});
    $.ajax({
        type: "POST",
        url: url,
        data: postdata
    })
    .done(function (data)
    {
        var obj = JSON.parse(data);
        var pretty = JSON.stringify(obj, null, 4);
        $(".result").html("<strong>Result!</strong><br><pre>" + pretty + "</pre>");
    });
}

function start_ws(onready, onmessage) {
    var created_sock = false;
    if (sock == null || sock.readyState != 1) {
        sock = new WebSocket(ws_url);
        created_sock = true;
    }
    sock.onopen = function (event) {
        console.log("opened ws to '" + ws_url + "'");
        onready(sock);
    };
    sock.onmessage = function(event) {
        onmessage(sock, event.data);
    }
    sock.onerror = function(event) {
        console.log("ws error (" + event + ")");
    };
    sock.onclose = function(event) {
        console.log("ws closed (" + event.code + ")");
    };
    if (!created_sock)
        onready(sock);
}

function call_ws_server(formbox, method) {
    call_id++;
    var params = gather_params(formbox);
    console.log(method);
    console.log(params);
    start_ws(
        function (sock) {
            var msg = JSON.stringify({id: call_id, method: method, params: params});
            sock.send(msg);
        },
        function (sock, data) {
            var obj = JSON.parse(data);
            var pretty = JSON.stringify(obj, null, 4);
            $(".result").html("<strong>Result!</strong><br><pre>" + pretty + "</pre>");
        }
    );
}

class FormBox extends React.Component {
    constructor(props) {
        super(props);
        // This binding is necessary to make `this` work in the callback
        this.toggle = this.toggle.bind(this);
        this.submit = this.submit.bind(this);
    }

    toggle() {
        if ("onToggle" in this.props)
            this.props.onToggle(this, this.props.id);
    }

    submit() {
        if ("ws_method" in this.props)
            call_ws_server(ReactDOM.findDOMNode(this), this.props.ws_method);
        else
            call_server(ReactDOM.findDOMNode(this), this.props.method, this.props.extra);
    }

    render() {
        return (
            <div className="panel panel-default">
                <div className="panel-heading" style={{cursor: "pointer"}} onClick={this.toggle}>{this.props.title}</div>
                <AnimakitExpander expanded={this.props.expanded}>
                    <Form schema={this.props.schema} onSubmit={this.submit}/>
                </AnimakitExpander>
            </div>
        );
    }
}

class Accordion extends React.Component {
    constructor(props) {
        super(props);
        this.state = {expanded: []};
        React.Children.map(this.props.children, (child, i) => {
            this.state.expanded.push(false);
        });
        // This binding is necessary to make `this` work in the callback
        this.onToggle = this.onToggle.bind(this);
    }

    isExpanded(i) {
        return this.state.expanded[i];
    }

    setExpanded(i, value) {
        this.state.expanded[i] = value;
    }

    onToggle(box, id) {
        if (!box.props.expanded) {
            React.Children.map(this.props.children, (child, i) => {
                if (id != i) {
                    if (this.isExpanded(i))
                        this.setExpanded(i, false);
                }
            });
            this.setExpanded(id, true);
        }
        else
            this.setExpanded(id, false);
        this.setState(this.state);
    }

    render() {
        const childrenWithProps = React.Children.map(this.props.children,
            (child, i) => React.cloneElement(child, {
                id: i,
                expanded: this.isExpanded(i),
                onToggle: this.onToggle
             })
        );
        return (
            <div className="panel-group">
                {childrenWithProps}
            </div>
        );
    }
}

const null_schema = {
  type: "object",
  properties: {}
};
const balance_query_schema = {
  type: "object",
  properties: {
      user_id: {type: "integer", title: "User Id", default: 1},
      asset: {type: "array", title: "Assets", items: { type: "string", default: "BTC"}}
  }
};
const balance_update_schema = {
  type: "object",
  properties: {
      user_id: {type: "integer", title: "User Id", default: 1},
      asset: {type: "string", title: "Asset", default: "BTC"},
      business_type: {type: "string", title: "Business Type", default: "deposit"},
      business_id: {type: "integer", title: "Business Id", default: 1},
      change: {type: "number", title: "Change", default: 1.5}
  }
};
const balance_history_schema = {
  type: "object",
  properties: {
      user_id: {type: "integer", title: "User Id", default: 1},
      asset: {type: "string", title: "Asset", default: "BTC"},
      business_type: {type: "string", title: "Business Type", default: "deposit"},
      start_time: {type: "integer", title: "Start Time", default: 0},
      end_time: {type: "integer", title: "End Time", default: 0},
      offset: {type: "integer", title: "Offset", default: 0},
      limit: {type: "integer", title: "Limit", default: 50}
  }
};

const order_put_limit = {
  type: "object",
  properties: {
      user_id: {type: "integer", title: "User Id", default: 1},
      market: {type: "string", title: "Market", default: "BTCUSD"},
      side: {type: "integer", title: "Side (1 ask, 2 bid)", enum: [1, 2], enumNames: ["Ask", "Bid"], default: 2},
      amount: {type: "number", title: "Amount", default: 1},
      price: {type: "number", title: "Price", default: 8000},
      taker_fee_rate: {type: "number", title: "Taker Fee Rate", default: 0.002},
      maker_fee_rate: {type: "number", title: "Maker Fee Rate", default: 0.001},
      source: {type: "string", title: "Source", default: ""},
  }
};
const order_put_market = {
  type: "object",
  properties: {
      user_id: {type: "integer", title: "User Id", default: 1},
      market: {type: "string", title: "Market", default: "BTCUSD"},
      side: {type: "integer", title: "Side (1 ask, 2 bid)", enum: [1, 2], enumNames: ["Ask", "Bid"], default: 2},
      amount: {type: "number", title: "Amount", default: 1},
      taker_fee_rate: {type: "number", title: "Taker Fee Rate", default: 0.002},
      source: {type: "string", title: "Source", default: ""},
  }
};
const order_cancel = {
  type: "object",
  properties: {
      user_id: {type: "integer", title: "User Id", default: 1},
      market: {type: "string", title: "Market", default: "BTCUSD"},
      order_id: {type: "integer", title: "Order Id", default: 1},
  }
};
const order_transactions = {
  type: "object",
  properties: {
      order_id: {type: "integer", title: "Order Id", default: 1},
      offset: {type: "integer", title: "Offset", default: 0},
      limit: {type: "integer", title: "Limit", default: 50},
  }
};
const order_book = {
  type: "object",
  properties: {
      market: {type: "string", title: "Market", default: "BTCUSD"},
      side: {type: "integer", title: "Side (1 ask, 2 bid)", enum: [1, 2], enumNames: ["Ask", "Bid"], default: 2},
      offset: {type: "integer", title: "Offset", default: 0},
      limit: {type: "integer", title: "Limit", default: 50},
  }
};
const order_depth = {
  type: "object",
  properties: {
      market: {type: "string", title: "Market", default: "BTCUSD"},
      limit: {type: "integer", title: "Limit", default: 50},
      interval: {type: "string", title: "Interval", default: "1"},
  }
};
const orders_pending = {
  type: "object",
  properties: {
      user_id: {type: "integer", title: "User Id", default: 1},
      market: {type: "string", title: "Market", default: "BTCUSD"},
      offset: {type: "integer", title: "Offset", default: 0},
      limit: {type: "integer", title: "Limit", default: 50},
  }
};
const order_pending_details = {
  type: "object",
  properties: {
      market: {type: "string", title: "Market", default: "BTCUSD"},
      order_id: {type: "integer", title: "Order Id", default: 1},
  }
};
const orders_completed = {
  type: "object",
  properties: {
      user_id: {type: "integer", title: "User Id", default: 1},
      market: {type: "string", title: "Market", default: "BTCUSD"},
      start_time: {type: "integer", title: "Start Time", default: 1},
      end_time: {type: "integer", title: "End Time", default: 120000000},
      offset: {type: "integer", title: "Offset", default: 0},
      limit: {type: "integer", title: "Limit", default: 50},
      side: {type: "integer", title: "Side (1 ask, 2 bid)", enum: [1, 2], enumNames: ["Ask", "Bid"], default: 2},
  }
};
const order_completed_details = {
  type: "object",
  properties: {
      order_id: {type: "integer", title: "Order Id", default: 1},
  }
};

const market_price = {
  type: "object",
  properties: {
      market: {type: "string", title: "Market", default: "BTCUSD"},
  }
};
const market_history = {
  type: "object",
  properties: {
      market: {type: "string", title: "Market", default: "BTCUSD"},
      limit: {type: "integer", title: "Limit", default: 50},
      last_id: {type: "integer", title: "Last Id", default: 0},
  }
};
const user_transaction_history = {
  type: "object",
  properties: {
      user_id: {type: "integer", title: "User Id", default: 1},
      market: {type: "string", title: "Market", default: "BTCUSD"},
      offset: {type: "integer", title: "Offset", default: 0},
      limit: {type: "integer", title: "Limit", default: 50},
  }
};
const kline = {
  type: "object",
  properties: {
      market: {type: "string", title: "Market", default: "BTCUSD"},
      start_time: {type: "integer", title: "Start Time", default: 1},
      end_time: {type: "integer", title: "End Time", default: 12000000},
      interval: {type: "integer", title: "Interval", default: 3600},
  }
};
const market_status = {
  type: "object",
  properties: {
      market: {type: "string", title: "Market", default: "BTCUSD"},
      period: {type: "integer", title: "Period", default: 86400},
  }
};
const market_status_today = {
  type: "object",
  properties: {
      market: {type: "string", title: "Market", default: "BTCUSD"},
  }
};
const ws_auth_schema = {
  type: "object",
  properties: {
      token: {type: "string", title: "Token", default: "<AUTH_TOKEN>"},
      source: {type: "string", title: "Source", default: ""},
  }
};
const ws_sign_schema = {
  type: "object",
  properties: {
      access_id: {type: "string", title: "Access ID", default: "<ACCESS_ID>"},
      authorization: {type: "string", title: "Authorisation", default: "<AUTHORISATION>"},
      tonce: {type: "integer", title: "Tonce", default: 1},
  }
};
const ws_kline_query_schema = {
  type: "object",
  properties: {
      market: {type: "string", title: "Market", default: "BTCUSD"},
      start: {type: "integer", title: "Start", default: 1},
      end: {type: "integer", title: "End", default: 120000000},
      interval: {type: "integer", title: "Interval", default: 3600},
  }
};
const ws_kline_subscribe_schema = {
  type: "object",
  properties: {
      market: {type: "string", title: "Market", default: "BTCUSD"},
      interval: {type: "integer", title: "Interval", default: 3600},
  }
};
const ws_price_query_schema = {
  type: "object",
  properties: {
      market: {type: "string", title: "Market", default: "BTCUSD"},
  }
};
const ws_price_subscribe_schema = {
  type: "object",
  properties: {
      markets: {type: "array", title: "Markets", items: { type: "string", default: "BTCUSD"}}
  }
};
const ws_today_query_schema = {
  type: "object",
  properties: {
      market: {type: "string", title: "Market", default: "BTCUSD"},
  }
};
const ws_today_subscribe_schema = {
  type: "object",
  properties: {
      markets: {type: "array", title: "Markets", items: { type: "string", default: "BTCUSD"}}
  }
};
const ws_deals_query_schema = {
  type: "object",
  properties: {
      market: {type: "string", title: "Market", default: "BTCUSD"},
      limit: {type: "integer", title: "Limit", default: 50},
      last_id: {type: "integer", title: "Last ID", default: 0},
  }
};
const ws_deals_subscribe_schema = {
  type: "object",
  properties: {
      markets: {type: "array", title: "Markets", items: { type: "string", default: "BTCUSD"}}
  }
};
const ws_depth_query_schema = {
  type: "object",
  properties: {
      market: {type: "string", title: "Market", default: "BTCUSD"},
      limit: {type: "integer", title: "Limit", default: 50},
      interval: {type: "string", title: "Interval", default: "0"},
  }
};
const ws_depth_subscribe_schema = {
  type: "object",
  properties: {
      market: {type: "string", title: "Market", default: "BTCUSD"},
      limit: {type: "integer", title: "Limit", default: 50},
      interval: {type: "string", title: "Interval", default: "0"},
  }
};
const ws_order_query_schema = {
  type: "object",
  properties: {
      market: {type: "string", title: "Market", default: "BTCUSD"},
      offset: {type: "integer", title: "Offset", default: 0},
      limit: {type: "integer", title: "Limit", default: 50},
  }
};
const ws_order_history_schema = {
  type: "object",
  properties: {
      market: {type: "string", title: "Market", default: "BTCUSD"},
      start_time: {type: "integer", title: "Start Time", default: 0},
      end_time: {type: "integer", title: "End Time", default: 0},
      offset: {type: "integer", title: "Offset", default: 0},
      limit: {type: "integer", title: "Limit", default: 50},
      //side: {type: "integer", title: "Side (0 - all, 1 - ask, 2 - bid)", default: 0},
  }
};
const ws_asset_query_schema = {
  type: "object",
  properties: {
      asset: {type: "array", title: "Assets", items: { type: "string", default: "BTC"}}
  }
};
const ws_asset_history_schema = {
  type: "object",
  properties: {
      asset: {type: "string", title: "Asset", default: "BTC"},
      //business: {type: "array", title: "Business", items: { type: "string", default: "deposit"}},
      business: {type: "string", title: "Business", default: ""},
      start_time: {type: "integer", title: "Start Time", default: 0},
      end_time: {type: "integer", title: "End Time", default: 0},
      offset: {type: "integer", title: "Offset", default: 0},
      limit: {type: "integer", title: "Limit", default: 50},
  }
};


const tabs = (
<Grid>
    <Row>
        <Column width="1/2">
            <Tabs>
            <TabList>
              <Tab tabFor="general">General</Tab>
              <Tab tabFor="balance">Balance</Tab>
              <Tab tabFor="trading">Trading</Tab>
              <Tab tabFor="market">Market</Tab>
              <Tab tabFor="websocket">Websocket</Tab>
              <Tab tabFor="websocket_auth">Websocket Auth</Tab>
            </TabList>
            <TabPanel tabId="general">
              <Accordion>
                <FormBox title="Asset List" method="asset.list" schema={null_schema}/>
                <FormBox title="Asset Summary" method="asset.summary" schema={null_schema}/>
                <FormBox title="Market List" method="market.list" schema={null_schema}/>
                <FormBox title="Market Summary" method="market.summary" schema={null_schema}/>
              </Accordion>
            </TabPanel>
            <TabPanel tabId="balance">
              <Accordion>
                <FormBox title="Balance Query" method="balance.query" schema={balance_query_schema}/>
                <FormBox title="Balance Update" method="balance.update" schema={balance_update_schema} extra={{}}/>
                <FormBox title="Balance History" method="balance.history" schema={balance_history_schema}/>
              </Accordion>
            </TabPanel>
            <TabPanel tabId="trading">
              <Accordion>
                <FormBox title="Limit Order" method="order.put_limit" schema={order_put_limit}/>
                <FormBox title="Market Order" method="order.put_market" schema={order_put_market}/>
                <FormBox title="Cancel Order" method="order.cancel" schema={order_cancel}/>
                <FormBox title="Order Transactions" method="order.deals" schema={order_transactions}/>
                <FormBox title="Order Book" method="order.book" schema={order_book}/>
                <FormBox title="Order Depth" method="order.depth" schema={order_depth}/>
                <FormBox title="Orders Pending" method="order.pending" schema={orders_pending}/>
                <FormBox title="Order Pending Details" method="order.pending_detail" schema={order_pending_details}/>
                <FormBox title="Orders Completed" method="order.finished" schema={orders_completed}/>
                <FormBox title="Order Completed Details" method="order.finished_detail" schema={order_completed_details}/>
              </Accordion>
            </TabPanel>
            <TabPanel tabId="market">
              <Accordion>
                <FormBox title="Market Price" method="market.last" schema={market_price}/>
                <FormBox title="Market History" method="market.deals" schema={market_history}/>
                <FormBox title="User Transaction History" method="market.user_deals" schema={user_transaction_history}/>
                <FormBox title="Kline" method="market.kline" schema={kline}/>
                <FormBox title="Market Status" method="market.status" schema={market_status}/>
                <FormBox title="Todays Market Status" method="market.status_today" schema={market_status_today}/>
              </Accordion>
            </TabPanel>
            <TabPanel tabId="websocket">
              <Accordion>
                <FormBox title="Ping" ws_method="server.ping" schema={null_schema}/>
                <FormBox title="Time" ws_method="server.time" schema={null_schema}/>
                <FormBox title="Kline Query" ws_method="kline.query" schema={ws_kline_query_schema}/>
                <FormBox title="Kline Subscribe" ws_method="kline.subscribe" schema={ws_kline_subscribe_schema}/>
                <FormBox title="Kline Unsubscribe" ws_method="kline.unsubscribe" schema={null_schema}/>
                <FormBox title="Price Query" ws_method="price.query" schema={ws_price_query_schema}/>
                <FormBox title="Price Subscribe" ws_method="price.subscribe" schema={ws_price_subscribe_schema}/>
                <FormBox title="Price Unsubscribe" ws_method="price.unsubscribe" schema={null_schema}/>
                <FormBox title="Todays Market Query" ws_method="today.query" schema={ws_today_query_schema}/>
                <FormBox title="Todays Market Subscribe" ws_method="today.subscribe" schema={ws_today_subscribe_schema}/>
                <FormBox title="Todays Market Unsubscribe" ws_method="today.unsubscribe" schema={null_schema}/>
                <FormBox title="Transactions Query" ws_method="deals.query" schema={ws_deals_query_schema}/>
                <FormBox title="Transactions Subscribe" ws_method="deals.subscribe" schema={ws_deals_subscribe_schema}/>
                <FormBox title="Transactions Unsubscribe" ws_method="deals.unsubscribe" schema={null_schema}/>
                <FormBox title="Depth Query" ws_method="depth.query" schema={ws_depth_query_schema}/>
                <FormBox title="Depth Subscribe" ws_method="depth.subscribe" schema={ws_depth_subscribe_schema}/>
                <FormBox title="Depth Unsubscribe" ws_method="depth.unsubscribe" schema={null_schema}/>
              </Accordion>
            </TabPanel>
            <TabPanel tabId="websocket_auth">
              <Accordion>
                <FormBox title="Auth" ws_method="server.auth" schema={ws_auth_schema}/>
                <FormBox title="Sign" ws_method="server.sign" schema={ws_sign_schema}/>
                <FormBox title="Pending Order Query" ws_method="order.query" schema={ws_order_query_schema}/>
                <FormBox title="Order History" ws_method="order.history" schema={ws_order_history_schema}/>
                <FormBox title="Order Subscribe" ws_method="order.subscribe" schema={null_schema}/>
                <FormBox title="Order Unsubscribe" ws_method="order.unsubscribe" schema={null_schema}/>
                <FormBox title="Asset Query" ws_method="asset.query" schema={ws_asset_query_schema}/>
                <FormBox title="Asset History" ws_method="asset.history" schema={ws_asset_history_schema}/>
                <FormBox title="Asset Subscribe" ws_method="asset.subscribe" schema={null_schema}/>
                <FormBox title="Asset Unsubscribe" ws_method="asset.unsubscribe" schema={null_schema}/>
              </Accordion>
            </TabPanel>
            </Tabs>
        </Column>
        <Column width="1/2">
            <div className="result">
                results...
            </div>
        </Column>
    </Row>
</Grid>
);
ReactDOM.render(
  tabs,
  document.getElementById('root')
);
