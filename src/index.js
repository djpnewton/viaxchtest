import React from 'react';
import ReactDOM from 'react-dom';

import { Tabs, Tab, TabPanel, TabList } from 'react-web-tabs';
import AnimakitExpander from 'animakit-expander';
import Form from "react-jsonschema-form";
import {Grid, Row, Column} from 'react-cellblock';

var url = "http://10.50.1.2:8080";
var call_id = 0;
function call_server(formbox, method, extra) {
    call_id++;
    var params = $(formbox).find("input, select").map(function () {
        var data = $(this).val();
        if ($(this).parent().hasClass("field-integer"))
            data = parseInt(data);
        return data;
    }).get();
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
        $(formbox).find(".result").html("<strong>Result!</strong><br><pre>" + pretty + "</pre>");
    });
}

class FormBox extends React.Component {
    constructor(props) {
        super(props);
        this.state = {expanded: false};
        // This binding is necessary to make `this` work in the callback
        this.toggle = this.toggle.bind(this);
        this.submit = this.submit.bind(this);
    }

    toggle() {
        this.setState(prevState => ({
            expanded: !prevState.expanded
        }));
    }

    submit() {
        var seen = [];
        var replacer = function(key, value) {
          if (value != null && typeof value == "object") {
            if (seen.indexOf(value) >= 0) {
              return;
            }
            seen.push(value);
          }
          return value;
        };
        call_server(ReactDOM.findDOMNode(this), this.props.method, this.props.extra);
    }

    render() {
        return (
            <div className="panel panel-default">
                <div className="panel-heading" style={{cursor: "pointer"}} onClick={this.toggle}>{this.props.title}</div>
                <AnimakitExpander expanded={this.state.expanded}>
                    <Grid>
                        <Row>
                            <Column width="1/2">
                                <Form schema={this.props.schema} onSubmit={this.submit}/>
                            </Column>
                            <Column width="1/2">
                                <div className="result">
                                    results...
                                </div>
                            </Column>
                        </Row>
                    </Grid>
                </AnimakitExpander>
            </div>
        );
    }
}

const balance_query_schema = {
  type: "object",
  properties: {
      user_id: {type: "integer", title: "User Id", default: 1},
      asset: {type: "string", title: "Asset Type", default: "BTC"}
  }
};
const balance_update_schema = {
  type: "object",
  properties: {
      user_id: {type: "integer", title: "User Id", default: 1},
      asset: {type: "string", title: "Asset Type", default: "BTC"},
      business_type: {type: "string", title: "Business Type", default: "deposit"},
      business_id: {type: "integer", title: "Business Id", default: 1},
      change: {type: "number", title: "Change", default: 1.5}
  }
};
const balance_history_schema = {
  type: "object",
  properties: {
      user_id: {type: "integer", title: "User Id", default: 1},
      asset: {type: "string", title: "Asset Type", default: "BTC"},
      business_type: {type: "string", title: "Business Type", default: "deposit"},
      start_time: {type: "integer", title: "Start Time", default: 0},
      end_time: {type: "integer", title: "End Time", default: 0},
      offset: {type: "integer", title: "Offset", default: 0},
      limit: {type: "integer", title: "Limit", default: 50}
  }
};

const BalanceApis = () => (
    <div className="panel-group">
        <FormBox title="Balance Query" method="balance.query" schema={balance_query_schema}/>
        <FormBox title="Balance Update" method="balance.update" schema={balance_update_schema} extra={{}}/>
        <FormBox title="Balance History" method="balance.history" schema={balance_history_schema}/>
    </div>
);

const order_put_limit = {
  type: "object",
  properties: {
      user_id: {type: "integer", title: "User Id", default: 1},
      market: {type: "string", title: "Market", default: "BTCCNY"},
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
      market: {type: "string", title: "Market", default: "BTCCNY"},
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
      market: {type: "string", title: "Market", default: "BTCCNY"},
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
      market: {type: "string", title: "Market", default: "BTCCNY"},
      side: {type: "integer", title: "Side (1 ask, 2 bid)", enum: [1, 2], enumNames: ["Ask", "Bid"], default: 2},
      offset: {type: "integer", title: "Offset", default: 0},
      limit: {type: "integer", title: "Limit", default: 50},
  }
};
const order_depth = {
  type: "object",
  properties: {
      market: {type: "string", title: "Market", default: "BTCCNY"},
      limit: {type: "integer", title: "Limit", default: 50},
      interval: {type: "string", title: "Interval", default: "1"},
  }
};
const orders_pending = {
  type: "object",
  properties: {
      user_id: {type: "integer", title: "User Id", default: 1},
      market: {type: "string", title: "Market", default: "BTCCNY"},
      offset: {type: "integer", title: "Offset", default: 0},
      limit: {type: "integer", title: "Limit", default: 50},
  }
};
const order_pending_details = {
  type: "object",
  properties: {
      market: {type: "string", title: "Market", default: "BTCCNY"},
      order_id: {type: "integer", title: "Order Id", default: 1},
  }
};
const orders_completed = {
  type: "object",
  properties: {
      user_id: {type: "integer", title: "User Id", default: 1},
      market: {type: "string", title: "Market", default: "BTCCNY"},
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

const TradingApis = () => (
    <div className="panel-group">
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
    </div>
);

const market_price = {
  type: "object",
  properties: {
      market: {type: "string", title: "Market", default: "BTCCNY"},
  }
};
const market_history = {
  type: "object",
  properties: {
      market: {type: "string", title: "Market", default: "BTCCNY"},
      limit: {type: "integer", title: "Limit", default: 50},
      last_id: {type: "integer", title: "Last Id", default: 0},
  }
};
const user_transaction_history = {
  type: "object",
  properties: {
      user_id: {type: "integer", title: "User Id", default: 1},
      market: {type: "string", title: "Market", default: "BTCCNY"},
      offset: {type: "integer", title: "Offset", default: 0},
      limit: {type: "integer", title: "Limit", default: 50},
  }
};
const kline = {
  type: "object",
  properties: {
      market: {type: "string", title: "Market", default: "BTCCNY"},
      start_time: {type: "integer", title: "Start Time", default: 1},
      end_time: {type: "integer", title: "End Time", default: 12000000},
      interval: {type: "integer", title: "Interval", default: 3600},
  }
};
const market_status = {
  type: "object",
  properties: {
      market: {type: "string", title: "Market", default: "BTCCNY"},
      period: {type: "integer", title: "Period", default: 86400},
  }
};
const market_status_today = {
  type: "object",
  properties: {
      market: {type: "string", title: "Market", default: "BTCCNY"},
  }
};

const MarketApis = () => (
    <div className="panel-group">
        <FormBox title="Market Price" method="market.last" schema={market_price}/>
        <FormBox title="Market History" method="market.deals" schema={market_history}/>
        <FormBox title="User Transaction History" method="market.user_deals" schema={user_transaction_history}/>
        <FormBox title="Kline" method="market.kline" schema={kline}/>
        <FormBox title="Market Status" method="market.status" schema={market_status}/>
        <FormBox title="Todays Market Status" method="market.status_today" schema={market_status_today}/>
    </div>
);

const tabs = (<Tabs>
    <TabList>
      <Tab tabFor="balance">Balance</Tab>
      <Tab tabFor="trading">Trading</Tab>
      <Tab tabFor="market">Market</Tab>
    </TabList>
    <TabPanel tabId="balance">
      <BalanceApis/>
    </TabPanel>
    <TabPanel tabId="trading">
      <TradingApis/>
    </TabPanel>
    <TabPanel tabId="market">
      <MarketApis/>
    </TabPanel>
</Tabs>);
ReactDOM.render(
  tabs,
  document.getElementById('root')
);
