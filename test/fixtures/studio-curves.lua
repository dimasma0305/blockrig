-- Paste into Roblox Studio's Command Bar. Builds a CurveAnimation with known keys in ServerStorage and selects it,
-- so it can be saved with right-click > Save to File... (local test fixture for BlockRig's curve decoder).
local function curve(parent, name, keys)
	local c = Instance.new("FloatCurve"); c.Name = name
	for _, k in ipairs(keys) do
		local key = FloatCurveKey.new(k[1], k[2], k[3])
		if k[4] ~= nil then key.LeftTangent = k[4] end
		if k[5] ~= nil then key.RightTangent = k[5] end
		c:InsertKey(key)
	end
	c.Parent = parent
	return c
end
local function folder(parent, name) local f = Instance.new("Folder"); f.Name = name; f.Parent = parent; return f end
local K = Enum.KeyInterpolationMode

local ca = Instance.new("CurveAnimation")
ca.Name = "BlockRigProbe"; ca.Loop = false; ca.Priority = Enum.AnimationPriority.Action
local hrp = folder(ca, "HumanoidRootPart")
local lt = folder(hrp, "LowerTorso")
local ut = folder(lt, "UpperTorso")
local arm = folder(ut, "RightUpperArm")

-- Euler rotation (YXZ), every interpolation mode, explicit tangents, a time that isn't a round number of ticks
local rot = Instance.new("EulerRotationCurve"); rot.Name = "Rotation"; rot.RotationOrder = Enum.RotationOrder.YXZ
curve(rot, "X", { {0, 0, K.Linear}, {0.5, 1.25, K.Cubic, 0.5, -2}, {1.2, -0.75, K.Constant}, {2, 0.3, K.Linear} })
curve(rot, "Y", { {0, 0.1, K.Linear}, {1/3, 0.4, K.Cubic}, {2, 0.4, K.Linear} })
curve(rot, "Z", { {0, 0.2, K.Constant} })
rot.Parent = arm

-- position (Vector3Curve) on the root joint
local pos = Instance.new("Vector3Curve"); pos.Name = "Position"
curve(pos, "X", { {0, 0, K.Linear}, {1, 0.5, K.Linear} })
curve(pos, "Y", { {0, 0, K.Cubic, 0, 1.5}, {1, 0.25, K.Linear} })
curve(pos, "Z", { {0, -0.1, K.Linear} })
pos.Parent = lt

-- quaternion rotation (RotationCurve) on the waist
local rc = Instance.new("RotationCurve"); rc.Name = "Rotation"
rc:InsertKey(RotationCurveKey.new(0, CFrame.new(), K.Linear))
rc:InsertKey(RotationCurveKey.new(1, CFrame.Angles(0, math.rad(40), 0), K.Cubic))
rc:InsertKey(RotationCurveKey.new(2, CFrame.Angles(math.rad(-20), 0, math.rad(10)), K.Constant))
rc.Parent = ut

-- markers and a face control
local mk = Instance.new("MarkerCurve"); mk.Name = "Footstep"
mk:InsertMarkerAtTime(0.25, "left"); mk:InsertMarkerAtTime(0.75, "right"); mk:InsertMarkerAtTime(1.5, "")
mk.Parent = ca
local face = folder(folder(ut, "Head"), "FaceControls")
curve(face, "JawDrop", { {0, 0, K.Linear}, {0.6, 0.9, K.Cubic}, {1.4, 0, K.Linear} })

ca.Parent = game:GetService("ServerStorage")
game:GetService("Selection"):Set({ ca })
print("BlockRigProbe ready in ServerStorage: right-click it > Save to File...")
