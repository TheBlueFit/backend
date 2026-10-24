import copy, os, sys, types, time, json, base64
from decimal import Decimal

os.environ['AUTH_SECRET'] = 'unit-test-signing-key-' + 'x' * 40
os.environ['ALLOWED_ORIGINS'] = 'http://localhost:3000'

# ---------------- stubs ----------------
class ClientError(Exception):
    def __init__(self, response, op='op'):
        super().__init__(str(response)); self.response = response

class HTTPException(Exception):
    def __init__(self, status_code, detail=None):
        self.status_code, self.detail = status_code, detail

class Cond:
    def __init__(self, fn): self.fn = fn
    def __and__(self, other): return Cond(lambda it: self.fn(it) and other.fn(it))
    def __or__(self, other): return Cond(lambda it: self.fn(it) or other.fn(it))
class Attr:
    def __init__(self, name): self.n = name
    def eq(self, v): return Cond(lambda it: it.get(self.n) == v)
    def begins_with(self, v): return Cond(lambda it: str(it.get(self.n, '')).startswith(v))
    def is_in(self, vs): return Cond(lambda it: it.get(self.n) in vs)
    def between(self, lo, hi): return Cond(lambda it: lo <= str(it.get(self.n, '')) <= hi)
    def gt(self, v): return Cond(lambda it: str(it.get(self.n, '')) > v)
    def lt(self, v): return Cond(lambda it: str(it.get(self.n, '')) < v)
Key = Attr

def assert_dynamo_safe(obj, path=''):
    if isinstance(obj, float): raise TypeError(f'DynamoDB rejects float at {path}')
    if obj is None: raise TypeError(f'DynamoDB item has None at {path} (we drop these)')
    if isinstance(obj, dict):
        for k, v in obj.items(): assert_dynamo_safe(v, f'{path}.{k}')
    if isinstance(obj, list):
        for i, v in enumerate(obj): assert_dynamo_safe(v, f'{path}[{i}]')

class FakeTable:
    def __init__(self): self.d = {}
    def _k(self, key): return (key['PK'], key['SK'])
    def get_item(self, Key):
        it = self.d.get(self._k(Key)); return {'Item': copy.deepcopy(it)} if it else {}
    def put_item(self, Item, ConditionExpression=None):
        assert_dynamo_safe(Item)
        if ConditionExpression == 'attribute_not_exists(PK)' and self._k(Item) in self.d:
            raise ClientError({'Error': {'Code': 'ConditionalCheckFailedException'}})
        self.d[self._k(Item)] = copy.deepcopy(Item)
    def delete_item(self, Key, ConditionExpression=None):
        if ConditionExpression == 'attribute_exists(PK)' and self._k(Key) not in self.d:
            raise ClientError({'Error': {'Code': 'ConditionalCheckFailedException'}})
        self.d.pop(self._k(Key), None)
    def update_item(self, Key, UpdateExpression, ExpressionAttributeValues, ExpressionAttributeNames=None,
                    ConditionExpression=None, ReturnValues=None):
        assert_dynamo_safe(ExpressionAttributeValues)
        it = self.d.get(self._k(Key))
        if it is None:
            if ConditionExpression: raise ClientError({'Error': {'Code': 'ConditionalCheckFailedException'}})
            it = dict(Key); self.d[self._k(Key)] = it
        import re
        m = re.match(r'^\s*SET\s+(.*?)(?:\s+ADD\s+(.*))?$', UpdateExpression)
        if m: sets, adds = m.group(1), m.group(2) or ''
        else:
            m = re.match(r'^\s*ADD\s+(.*)$', UpdateExpression); assert m, UpdateExpression
            sets, adds = '', m.group(1)
        names = ExpressionAttributeNames or {}
        out = {}
        for part in [p for p in sets.split(',') if p.strip()]:
            lhs, rhs = [s.strip() for s in part.split('=')]
            lhs = names.get(lhs, lhs)
            it[lhs] = ExpressionAttributeValues[rhs]; out[lhs] = it[lhs]
        for part in [p for p in adds.split(',') if p.strip()]:
            lhs, rhs = part.strip().split()
            lhs = names.get(lhs, lhs)
            it[lhs] = it.get(lhs, 0) + ExpressionAttributeValues[rhs]; out[lhs] = it[lhs]
        return {'Attributes': out} if ReturnValues else {}
    def scan(self, FilterExpression=None, ExclusiveStartKey=None, ProjectionExpression=None, ExpressionAttributeNames=None):
        items = [copy.deepcopy(v) for v in self.d.values() if FilterExpression is None or FilterExpression.fn(v)]
        if ProjectionExpression:
            names = ExpressionAttributeNames or {}
            keep = [names.get(k.strip(), k.strip()) for k in ProjectionExpression.split(',')]
            items = [{k: v for k, v in it.items() if k in keep} for it in items]
        return {'Items': items}
    def query(self, KeyConditionExpression, ScanIndexForward=True, Limit=None, ExclusiveStartKey=None):
        items = sorted((copy.deepcopy(v) for v in self.d.values() if KeyConditionExpression.fn(v)),
                       key=lambda i: i['SK'], reverse=not ScanIndexForward)
        return {'Items': items[:Limit] if Limit else items}

TABLE = FakeTable()

def mod(name, **attrs):
    m = types.ModuleType(name); m.__dict__.update(attrs); sys.modules[name] = m; return m

class _Res:
    def Table(self, name): return TABLE
mod('boto3', resource=lambda n: _Res(), client=lambda n: None)
mod('boto3.dynamodb'); mod('boto3.dynamodb.conditions', Attr=Attr, Key=Key)
mod('botocore'); mod('botocore.exceptions', ClientError=ClientError)

class FastAPI:
    def __init__(self, **kw): pass
    def add_middleware(self, *a, **k): pass
    def _reg(self, *a, **k): return lambda fn: fn
    get = post = put = delete = middleware = exception_handler = _reg
mod('fastapi', FastAPI=FastAPI, Depends=lambda f: ('dep', f), Header=lambda default=None: default,
    HTTPException=HTTPException, Request=object)
mod('fastapi.middleware'); mod('fastapi.middleware.cors', CORSMiddleware=object)
mod('fastapi.responses', JSONResponse=object)
mod('mangum', Mangum=lambda app: None)

class BaseModel:
    def __init__(self, **kw):
        ann = {}
        for c in reversed(type(self).__mro__): ann.update(getattr(c, '__annotations__', {}))
        self._ann, self._set = list(ann), set()
        for k in ann:
            if k in kw: setattr(self, k, kw[k]); self._set.add(k)
            elif hasattr(type(self), k): setattr(self, k, getattr(type(self), k))
            else: raise ValueError(f'missing field {k}')
    def model_dump(self, exclude_unset=False):
        return {k: getattr(self, k) for k in self._ann if not exclude_unset or k in self._set}
mod('pydantic', BaseModel=BaseModel)

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'functions', 'core_api'))
import main  # noqa: E402
